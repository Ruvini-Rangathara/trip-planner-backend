// src/places/places-suggest.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { OverpassService, Place } from './overpass.service';

type Activity = 'beach' | 'hike' | 'city';

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

/** Map category -> broad activity bucket */
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

/** Score a day (higher is better) */
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

/** Minimal concurrency limiter (no external deps) */
async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length) as R[];
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

  // “Hard safety” limits – configurable (more forgiving defaults)
  private readonly beachMaxRainHi: number;
  private readonly hikeMaxRainHi: number;
  private readonly maxTHiAll: number;

  // Min “good days” gate – configurable
  private readonly minGoodDaysDefault: number;

  constructor(
    private readonly http: HttpService,
    private readonly overpass: OverpassService,
    private readonly cfg: ConfigService,
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

  /** Main entry */
  async suggest(opts: {
    lat: number;
    lon: number;
    radius?: number;
    kinds?: string;
    start?: string;
    end?: string;
    minGoodDays?: number;
    limit?: number;
  }) {
    // 1) Get candidate places
    const places = await this.overpass.nearbyTravelPlaces(
      opts.lat,
      opts.lon,
      opts.radius ?? 20000,
      opts.kinds,
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

        // Hard safety filters (configurable + slightly relaxed defaults)
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

    const results = (computed.filter(Boolean) as NonNullable<Row>[]).sort(
      (a, b) => b.score - a.score || a.place.distance_m - b.place.distance_m,
    );

    // 4) If nothing passed, run a relaxed fallback so UI isn’t empty
    if (results.length === 0) {
      this.log.warn(
        `No suggestions after filtering. candidates=${batch.length} rejected=${JSON.stringify(
          rejected,
        )}. Running relaxed fallback.`,
      );

      const nearest = batch.slice(0, Math.min(10, batch.length));
      const fallback: NonNullable<Row>[] = [];

      for (const p of nearest) {
        try {
          const dailyRaw = await this.forecast(p.lat, p.lon);
          const daily = dailyRaw.filter((d) =>
            inRange(d.date, opts.start, opts.end),
          );
          if (!daily.length) continue;

          const scores = daily.map((d) => scoreDay(d.t2m, d.precip));
          const goodDays = scores.filter((s) => s >= 3).length;

          const sumRain = daily.reduce((a, b) => a + (b.precip ?? 0), 0);
          const avgT =
            daily.reduce((a, b) => a + (b.t2m ?? 0), 0) / (daily.length || 1);

          fallback.push({
            place: p,
            activity: activityFromCategory(p.category),
            score: scores.reduce((a, b) => a + b, 0),
            summary: {
              goodDays,
              days: daily.length,
              sumRain: +sumRain.toFixed(1),
              avgT: +avgT.toFixed(1),
              maxRainHi: Math.max(...daily.map((d) => d.precip_hi ?? 0)),
              maxTHi: Math.max(...daily.map((d) => d.t2m_hi ?? -99)),
            },
          });
        } catch {
          // ignore
        }
      }

      if (fallback.length === 0) {
        // last resort — nearest places without weather summaries
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

      return fallback.sort(
        (a, b) => b.score - a.score || a.place.distance_m - b.place.distance_m,
      );
    }

    return results;
  }
}
