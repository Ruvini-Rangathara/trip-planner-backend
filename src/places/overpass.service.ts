import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

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

@Injectable()
export class OverpassService {
  constructor(
    private http: HttpService,
    private cfg: ConfigService,
  ) {}

  private base(): string {
    return (
      this.cfg.get<string>('OVERPASS_BASE') ??
      'https://overpass-api.de/api/interpreter'
    );
  }
  private ua(): string {
    return this.cfg.get<string>('OVERPASS_USER_AGENT') ?? 'villagecast/1.0';
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
      // common nature spots people visit
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

  async nearbyTravelPlaces(
    lat: number,
    lon: number,
    radius = 30000,
    kindsCsv?: string,
  ): Promise<Place[]> {
    const r = Math.max(100, Math.min(radius, 50000)); // 100m..50km
    const kinds = new Set(
      (kindsCsv ?? 'tourism,natural,historic,park')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );

    const ql = this.buildQuery(lat, lon, r, { kinds });
    const { data } = await firstValueFrom(
      this.http.post<OverpassResponse>(this.base(), ql, {
        headers: {
          'Content-Type': 'text/plain; charset=UTF-8',
          'User-Agent': this.ua(),
        },
      }),
    );

    const out: Place[] = [];
    for (const el of data.elements ?? []) {
      const c =
        el.type === 'node'
          ? { lat: el.lat!, lon: el.lon! }
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
