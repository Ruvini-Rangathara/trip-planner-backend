// cspell:ignore precip PRECIP interp
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import {
  Place,
  OverpassResponse,
  OsmElement,
  OverpassService,
} from './overpass.service';

type Activity = 'beach' | 'hike' | 'city';
type SuggestMode = 'areas' | 'attractions';

interface ForecastRow {
  date: string;
  t2m?: number;
  t2m_hi?: number;
  precip?: number;
  precip_hi?: number;
}
interface ForecastEnvelope {
  code: number;
  data: { daily: ForecastRow[] };
}

interface SuggestOptions {
  lat: number;
  lon: number;
  radius?: number;
  kinds?: string; // kept for compat (unused when mode provided)
  start?: string;
  end?: string;
  minGoodDays?: number;
  limit?: number;
  mode?: SuggestMode; // preferred
  suggestMode?: SuggestMode; // legacy body field supported
}

const activityFromCategory = (cat: string): Activity => {
  const c = (cat || '').toLowerCase();
  if (c.includes('beach')) return 'beach';
  if (
    c.startsWith('natural:') ||
    c === 'leisure:park' ||
    c.includes('viewpoint')
  )
    return 'hike';
  if (c.startsWith('historic:')) return 'city';
  if (c.startsWith('tourism:')) return c.includes('museum') ? 'city' : 'hike';
  return 'city';
};

const inRange = (d: string, start?: string, end?: string) =>
  (!start || d >= start) && (!end || d <= end);

const scoreDay = (t?: number, r?: number): number => {
  if (t == null || r == null) return -1;
  let s = 0;
  if (t >= 22 && t <= 32) s += 2;
  else if ((t >= 20 && t < 22) || (t > 32 && t <= 34)) s += 1;
  if (r < 1) s += 2;
  else if (r <= 5) s += 1;
  if (t > 35) s -= 2;
  if (r > 10) s -= 2;
  return s;
};

async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array<R>(items.length);
  let next = 0;
  async function run(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await worker(items[i], i);
    }
  }
  const n = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: n }, run));
  return out;
}

@Injectable()
export class PlacesSuggestService {
  private readonly log = new Logger(PlacesSuggestService.name);

  private readonly flaskBase: string;
  private readonly flaskTimeoutMs: number;
  private readonly flaskRetries: number;
  private readonly flaskBackoffMs: number;

  private readonly beachMaxRainHi: number;
  private readonly hikeMaxRainHi: number;
  private readonly maxTHiAll: number;

  private readonly minGoodDaysDefault: number;

  constructor(
    private readonly http: HttpService,
    private readonly cfg: ConfigService,
    private readonly overpass: OverpassService,
  ) {
    this.flaskBase =
      this.cfg.get<string>('FLASK_BASE') ?? 'http://127.0.0.1:8000';
    this.flaskTimeoutMs = this.num(
      this.cfg.get<string>('FLASK_TIMEOUT_MS'),
      45_000,
    );
    this.flaskRetries = this.num(this.cfg.get<string>('FLASK_RETRIES'), 2);
    this.flaskBackoffMs = this.num(
      this.cfg.get<string>('FLASK_RETRY_BACKOFF_MS'),
      800,
    );

    this.beachMaxRainHi = this.num(
      this.cfg.get<string>('SUGGEST_BEACH_MAX_RAIN_HI'),
      25,
    );
    this.hikeMaxRainHi = this.num(
      this.cfg.get<string>('SUGGEST_HIKE_MAX_RAIN_HI'),
      30,
    );
    this.maxTHiAll = this.num(this.cfg.get<string>('SUGGEST_MAX_T_HI'), 38);
    this.minGoodDaysDefault = this.num(
      this.cfg.get<string>('SUGGEST_MIN_GOOD_DAYS'),
      1,
    );
  }

  private num(v: unknown, fallback: number): number {
    const n = typeof v === 'string' ? Number(v) : (v as number);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  }

  private async withRetry<T>(op: () => Promise<T>): Promise<T> {
    let last: unknown;
    for (let a = 0; a <= this.flaskRetries; a++) {
      try {
        return await op();
      } catch (e) {
        last = e;
        if (a === this.flaskRetries) break;
        const wait = this.flaskBackoffMs * Math.pow(2, a);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    throw last;
  }

  private async forecast(lat: number, lon: number): Promise<ForecastRow[]> {
    const url = `${this.flaskBase}/forecast`;
    const { data } = await this.withRetry(() =>
      firstValueFrom(
        this.http.get<ForecastEnvelope>(url, {
          params: { lat, lon, interp: '1', vars: 'T2M,PRECIP' },
          timeout: this.flaskTimeoutMs,
        }),
      ),
    );
    return data?.data?.daily ?? [];
  }

  // ---------------- Overpass helpers ----------------

  private buildOverpassQuery(
    lat: number,
    lon: number,
    radiusM: number,
    mode: SuggestMode,
  ): string {
    if (mode === 'areas') {
      return `
        [out:json][timeout:25];
        (
          node(around:${radiusM},${lat},${lon})["place"~"city|town|village|suburb|hamlet"]["name"];
          way(around:${radiusM},${lat},${lon})["place"~"city|town|village|suburb|hamlet"]["name"];
          rel(around:${radiusM},${lat},${lon})["boundary"="administrative"]["name"]["admin_level"~"8|9|10"];
        );
        out center tags;
      `;
    }
    // attractions
    return `
      [out:json][timeout:25];
      (
        nwr(around:${radiusM},${lat},${lon})["tourism"~"attraction|museum|viewpoint|theme_park|zoo"]["name"];
        nwr(around:${radiusM},${lat},${lon})["historic"~"monument|ruins|archaeological_site|castle|memorial"]["name"];
        nwr(around:${radiusM},${lat},${lon})["leisure"~"park|garden|nature_reserve"]["name"];
        nwr(around:${radiusM},${lat},${lon})["amenity"="place_of_worship"]["name"];
        nwr(around:${radiusM},${lat},${lon})["natural"~"peak|waterfall|cave_entrance"]["name"];
      );
      out center tags;
    `;
  }

  private getName(tags: Record<string, string> = {}): string | null {
    const name = tags['name:en'] ?? tags['int_name'] ?? tags['name'] ?? null;
    if (!name) return null;
    const trimmed = name.trim();
    if (!trimmed) return null;
    if (/^[a-z_]+$/.test(trimmed)) return null; // filter generic snake_case
    return trimmed;
  }

  private pickCategory(tags: Record<string, string> = {}): string {
    for (const k of [
      'tourism',
      'historic',
      'natural',
      'leisure',
      'amenity',
      'place',
    ] as const) {
      const v = tags[k];
      if (!v) continue;
      if (k === 'leisure' && v !== 'park') continue; // only keep park under leisure
      return `${k}:${v}`;
    }
    if (tags['boundary'] === 'administrative' && tags['admin_level']) {
      return `boundary:administrative(${tags['admin_level']})`;
    }
    return 'other';
  }

  private coord(el: OsmElement): { lat: number; lon: number } | null {
    if (typeof el.lat === 'number' && typeof el.lon === 'number')
      return { lat: el.lat, lon: el.lon };
    if (
      el.center &&
      typeof el.center.lat === 'number' &&
      typeof el.center.lon === 'number'
    ) {
      return { lat: el.center.lat, lon: el.center.lon };
    }
    return null;
  }

  private haversine(
    a: { lat: number; lon: number },
    b: { lat: number; lon: number },
  ): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  private dedupeKeepNearest<
    T extends { name: string; category: string; distance_m: number },
  >(items: T[]): T[] {
    const key = (x: T) => `${x.name.toLowerCase()}@${x.category}`;
    const map = new Map<string, T>();
    for (const it of items) {
      const k = key(it);
      const prev = map.get(k);
      if (!prev || it.distance_m < prev.distance_m) map.set(k, it);
    }
    return Array.from(map.values());
  }

  private async fetchOverpassCandidates(
    lat: number,
    lon: number,
    radiusM: number,
    mode: SuggestMode,
  ): Promise<Place[]> {
    const ql = this.buildOverpassQuery(lat, lon, radiusM, mode);

    // ✔ Use OverpassService's mirror+agent logic instead of direct axios
    const resp: OverpassResponse = await this.overpass.runQL(ql);

    const elements: OsmElement[] = Array.isArray(resp?.elements)
      ? resp.elements
      : [];
    const here = { lat, lon };

    const mapped: Place[] = [];
    for (const el of elements) {
      const tags: Record<string, string> = el.tags ?? {};
      const name = this.getName(tags);
      if (!name) continue;

      const pt = this.coord(el);
      if (!pt) continue;

      const category = this.pickCategory(tags);
      if (category === 'other') continue;

      const catValue = category.split(':')[1]?.toLowerCase() ?? '';
      if (name.toLowerCase() === catValue) continue;

      const distance_m = Math.round(this.haversine(here, pt));
      mapped.push({
        id: `${el.type}/${el.id}`,
        type: el.type,
        name,
        category, // e.g. "place:town", "tourism:attraction"
        lat: pt.lat,
        lon: pt.lon,
        distance_m,
        tags,
      });
    }

    return this.dedupeKeepNearest(mapped)
      .sort((a, b) => a.distance_m - b.distance_m)
      .slice(0, 60);
  }

  // ---------------- Main entry ----------------

  async suggest(opts: SuggestOptions) {
    const radius = opts.radius ?? 20_000;
    const mode: SuggestMode = opts.mode ?? opts.suggestMode ?? 'areas';

    this.log.debug(
      `suggest(): mode=${mode} radius=${radius} lat=${opts.lat} lon=${opts.lon}`,
    );

    // 1) Always use the explicit Overpass “areas/attractions” query
    const places = await this.fetchOverpassCandidates(
      opts.lat,
      opts.lon,
      radius,
      mode,
    );

    // 2) Limit how many we check to keep it fast (nearest first)
    const maxCheck = Math.max(5, Math.min(opts.limit ?? 40, 120));
    const batch = places.slice(0, maxCheck);

    // 3) Forecast each place (controlled concurrency)
    const rejected = { byWeather: 0, byGoodDays: 0, byEmpty: 0, byError: 0 };

    type Row = {
      place: Place;
      activity: Activity;
      score: number;
      summary: {
        goodDays: number;
        days: number;
        sumRain: number;
        avgT: number;
        maxRainHi: number;
        maxTHi: number;
      };
    } | null;

    const minGoodDays = opts.minGoodDays ?? this.minGoodDaysDefault;

    const computed = await mapWithLimit(batch, 6, async (p): Promise<Row> => {
      try {
        const dailyRaw = await this.forecast(p.lat, p.lon);
        const daily = dailyRaw.filter((d) =>
          inRange(d.date, opts.start, opts.end),
        );
        if (!daily.length) {
          rejected.byEmpty++;
          return null;
        }

        const activity = activityFromCategory(p.category);
        const maxRainHi = Math.max(...daily.map((d) => d.precip_hi ?? 0));
        const maxTHi = Math.max(...daily.map((d) => d.t2m_hi ?? -99));

        if (
          (activity === 'beach' &&
            (maxRainHi > this.beachMaxRainHi || maxTHi > this.maxTHiAll)) ||
          (activity === 'hike' &&
            (maxRainHi > this.hikeMaxRainHi || maxTHi > this.maxTHiAll))
        ) {
          rejected.byWeather++;
          return null;
        }

        const scores = daily.map((d) => scoreDay(d.t2m, d.precip));
        const goodDays = scores.filter((s) => s >= 3).length;
        if (goodDays < minGoodDays) {
          rejected.byGoodDays++;
          return null;
        }

        const sumRain = daily.reduce((a, b) => a + (b.precip ?? 0), 0);
        const avgT =
          daily.reduce((a, b) => a + (b.t2m ?? 0), 0) / (daily.length || 1);
        const totalScore = scores.reduce((a, b) => a + b, 0);

        return {
          place: p,
          activity,
          score: totalScore,
          summary: {
            goodDays,
            days: daily.length,
            sumRain: +sumRain.toFixed(1),
            avgT: +avgT.toFixed(1),
            maxRainHi,
            maxTHi,
          },
        };
      } catch {
        rejected.byError++;
        return null;
      }
    });

    const results = (computed.filter(Boolean) as Exclude<Row, null>[]).sort(
      (a, b) => b.score - a.score || a.place.distance_m - b.place.distance_m,
    );

    if (results.length === 0) {
      this.log.warn(
        `No suggestions after filtering (mode=${mode}). candidates=${batch.length} rejected=${JSON.stringify(
          rejected,
        )}. Returning nearest (relaxed).`,
      );

      const nearest = batch.slice(0, Math.min(10, batch.length));
      return nearest.map((p) => ({
        place: p,
        activity: activityFromCategory(p.category),
        score: 0,
        summary: {
          goodDays: 0,
          days: 0,
          sumRain: 0,
          avgT: 0,
          maxRainHi: 0,
          maxTHi: 0,
        },
      }));
    }

    return results;
  }
}
