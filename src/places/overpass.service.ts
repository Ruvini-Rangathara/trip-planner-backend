import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { AxiosError } from 'axios';
import * as https from 'https';
import type { Agent as HttpsAgent } from 'https';

/** ---------------- Types ---------------- */
export type OsmElementType = 'node' | 'way' | 'relation';

export interface OsmElement {
  type: OsmElementType;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  version: number;
  generator: string;
  elements: OsmElement[];
}

export interface Place {
  id: string; // e.g. "node/123" | "way/456"
  type: OsmElementType;
  name: string;
  category: string; // tourism:*, natural:*, historic:*, leisure:park
  lat: number;
  lon: number;
  distance_m: number;
  tags: Record<string, string>;
}

/** Axios error type guard (no-unsafe access safe) */
function isAxiosError<T = unknown>(err: unknown): err is AxiosError<T> {
  return (
    !!err &&
    typeof err === 'object' &&
    (err as AxiosError).isAxiosError === true
  );
}

@Injectable()
export class OverpassService {
  constructor(
    private http: HttpService,
    private cfg: ConfigService,
  ) {}

  /** Primary base (kept for backwards-compat) */
  private base(): string {
    return (
      this.cfg.get<string>('OVERPASS_BASE') ??
      'https://overpass-api.de/api/interpreter'
    );
  }

  /** Failover mirror list (first reachable used) */
  private bases(): string[] {
    const env = this.cfg.get<string>('OVERPASS_BASES');
    if (env && env.split(',').filter(Boolean).length) {
      return env
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    // sensible defaults
    return [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.openstreetmap.ru/api/interpreter',
      'https://overpass.osm.ch/api/interpreter',
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    ];
  }

  private timeoutMs(): number {
    const raw = this.cfg.get<string>('OVERPASS_TIMEOUT_MS');
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 20000;
  }

  private radiusMax(): number {
    const raw = this.cfg.get<string>('OVERPASS_RADIUS_MAX');
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 30000;
  }

  private ua(): string {
    return (
      this.cfg.get<string>('OVERPASS_USER_AGENT') ??
      'trip-planner/1.0 (mailto:you@example.com)'
    );
  }

  /** Build Overpass QL for nearby “travel areas” (POIs) */
  private buildQuery(
    lat: number,
    lon: number,
    radius: number,
    opts: { kinds: Set<string> },
  ): string {
    const includeTourism = opts.kinds.has('tourism');
    const includeNatural = opts.kinds.has('natural');
    const includeHistoric = opts.kinds.has('historic');
    const includePark = opts.kinds.has('park');

    const parts: string[] = [];
    if (includeTourism) {
      parts.push(`
        node(around:${radius},${lat},${lon})[tourism];
        way(around:${radius},${lat},${lon})[tourism];
        relation(around:${radius},${lat},${lon})[tourism];
      `);
    }
    if (includeNatural) {
      parts.push(`
        node(around:${radius},${lat},${lon})[natural~"beach|waterfall|peak|cliff|cave_entrance|spring|geyser|moor|dune|wetland"];
        way(around:${radius},${lat},${lon})[natural~"beach|waterfall|peak|cliff|cave_entrance|spring|geyser|moor|dune|wetland"];
        relation(around:${radius},${lat},${lon})[natural~"beach|waterfall|peak|cliff|cave_entrance|spring|geyser|moor|dune|wetland"];
      `);
    }
    if (includeHistoric) {
      parts.push(`
        node(around:${radius},${lat},${lon})[historic];
        way(around:${radius},${lat},${lon})[historic];
        relation(around:${radius},${lat},${lon})[historic];
      `);
    }
    if (includePark) {
      parts.push(`
        node(around:${radius},${lat},${lon})[leisure=park];
        way(around:${radius},${lat},${lon})[leisure=park];
        relation(around:${radius},${lat},${lon})[leisure=park];
      `);
    }

    const body = parts.join('\n');
    return `
      [out:json][timeout:30];
      (
        ${body}
      );
      out center;
    `;
  }

  private static toName(tags?: Record<string, string>): string {
    if (!tags) return 'Unnamed';
    return (
      tags['name'] ??
      tags['name:en'] ??
      tags['tourism'] ??
      tags['historic'] ??
      tags['natural'] ??
      'Unnamed'
    );
  }

  private static toCategory(tags?: Record<string, string>): string {
    if (!tags) return 'other';
    if (tags['tourism']) return `tourism:${tags['tourism']}`;
    if (tags['natural']) return `natural:${tags['natural']}`;
    if (tags['historic']) return `historic:${tags['historic']}`;
    if (tags['leisure'] === 'park') return 'leisure:park';
    return 'other';
  }

  private static haversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // meters
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  /** Core: post to Overpass with mirror failover & safe error handling */
  private async postOverpassWithFailover(
    ql: string,
  ): Promise<OverpassResponse> {
    const mirrors = this.bases();
    const timeout = this.timeoutMs();

    // Prefer IPv4 when possible, but be defensive if https.Agent is unavailable
    const httpsAgent: HttpsAgent | undefined =
      typeof (
        https as unknown as { Agent?: new (...args: any[]) => HttpsAgent }
      ).Agent === 'function'
        ? new https.Agent({ family: 4 })
        : undefined;

    let lastErrMsg = 'Unknown error contacting Overpass';

    for (const base of mirrors) {
      try {
        const { data } = await firstValueFrom(
          this.http.post<OverpassResponse>(base, ql, {
            headers: {
              'Content-Type': 'text/plain; charset=UTF-8',
              'User-Agent': this.ua(),
            },
            timeout,
            maxRedirects: 5,
            ...(httpsAgent ? { httpsAgent } : {}),
          }),
        );
        return data;
      } catch (err: unknown) {
        if (isAxiosError(err)) {
          const code = err.code ?? '';
          const status = err.response?.status;
          const msg = err.message ?? '';
          lastErrMsg = `Overpass '${base}' failed${status ? ` (HTTP ${status})` : code ? ` [${code}]` : ''}${msg ? `: ${msg}` : ''}`;
        } else if (err instanceof Error) {
          lastErrMsg = `Overpass '${base}' failed: ${err.message}`;
        } else {
          lastErrMsg = `Overpass '${base}' failed`;
        }
        // continue to the next mirror
      }
    }

    throw new Error(lastErrMsg);
  }

  /** Public API: run raw QL with proper failover/agent */
  public async runQL(ql: string): Promise<OverpassResponse> {
    return this.postOverpassWithFailover(ql);
  }

  /** Public API: find nearby travel POIs (with categories) */
  async nearbyTravelPlaces(
    lat: number,
    lon: number,
    radius = 30000,
    kindsCsv?: string,
  ): Promise<Place[]> {
    const r = Math.max(100, Math.min(radius, this.radiusMax())); // clamp 100m..radiusMax
    const kinds = new Set(
      (kindsCsv ?? 'tourism,natural,historic,park')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );

    const ql = this.buildQuery(lat, lon, r, { kinds });
    const data = await this.postOverpassWithFailover(ql);

    const out: Place[] = [];
    for (const el of data.elements ?? []) {
      const c =
        el.type === 'node'
          ? el.lat != null && el.lon != null
            ? { lat: el.lat, lon: el.lon }
            : null
          : (el.center ?? null);
      if (!c) continue;

      const name = OverpassService.toName(el.tags);
      const category = OverpassService.toCategory(el.tags);
      if (category === 'other') continue; // keep only travel categories

      out.push({
        id: `${el.type}/${el.id}`,
        type: el.type,
        name,
        category,
        lat: c.lat,
        lon: c.lon,
        distance_m: Math.round(
          OverpassService.haversine(lat, lon, c.lat, c.lon),
        ),
        tags: el.tags ?? {},
      });
    }

    // sort by distance and de-dup by id
    const uniq = new Map<string, Place>();
    for (const p of out.sort((a, b) => a.distance_m - b.distance_m)) {
      if (!uniq.has(p.id)) uniq.set(p.id, p);
    }
    return Array.from(uniq.values());
  }
}
