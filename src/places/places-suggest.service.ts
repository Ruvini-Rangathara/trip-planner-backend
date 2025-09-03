import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
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

@Injectable()
export class PlacesSuggestService {
  private flaskBase = process.env.FLASK_BASE ?? 'http://127.0.0.1:8000';

  constructor(
    private http: HttpService,
    private overpass: OverpassService,
  ) {}

  private async forecast(lat: number, lon: number): Promise<ForecastRow[]> {
    const { data } = await firstValueFrom(
      this.http.get<ForecastEnvelope>(`${this.flaskBase}/forecast`, {
        params: { lat, lon, interp: '1', vars: 'T2M,PRECIP' },
        timeout: 15000,
      }),
    );
    return data.data.daily;
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

    // 3) Forecast each place (simple concurrency: 8 at a time)
    const chunks: Place[][] = [];
    for (let i = 0; i < batch.length; i += 8)
      chunks.push(batch.slice(i, i + 8));

    const results: Array<{
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
    }> = [];

    for (const group of chunks) {
      const promises = group.map(async (p) => {
        const daily = (await this.forecast(p.lat, p.lon)).filter((d) =>
          inRange(d.date, opts.start, opts.end),
        );
        if (!daily.length) return;

        // Hard safety filters by activity
        const activity = activityFromCategory(p.category);
        const maxRainHi = Math.max(...daily.map((d) => d.precip_hi ?? 0));
        const maxTHi = Math.max(...daily.map((d) => d.t2m_hi ?? -99));
        if (activity === 'beach' && (maxRainHi > 15 || maxTHi > 36)) return;
        if (activity === 'hike' && (maxRainHi > 20 || maxTHi > 36)) return;

        // Score
        const scores = daily.map((d) => scoreDay(d.t2m, d.precip));
        const goodDays = scores.filter((s) => s >= 3).length;
        const minGood = opts.minGoodDays ?? 1;
        if (goodDays < minGood) return;

        const sumRain = daily.reduce((a, b) => a + (b.precip ?? 0), 0);
        const avgT =
          daily.reduce((a, b) => a + (b.t2m ?? 0), 0) / (daily.length || 1);
        const score = scores.reduce((a, b) => a + b, 0);

        results.push({
          place: p,
          activity,
          score,
          summary: {
            goodDays,
            days: daily.length,
            sumRain: +sumRain.toFixed(1),
            avgT: +avgT.toFixed(1),
            maxRainHi,
            maxTHi,
          },
        });
      });
      await Promise.all(promises);
    }

    // 4) Sort & return
    return results.sort(
      (a, b) => b.score - a.score || a.place.distance_m - b.place.distance_m,
    );
  }
}
