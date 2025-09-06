// src/places/places-weather.service.ts
import pLimit from 'p-limit';
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

type Activity = 'beach' | 'hike' | 'city';

interface Place {
  id: string;
  name: string;
  category: string; // e.g., "tourism:museum", "natural:waterfall"
  lat: number;
  lon: number;
  distance_m: number;
  tags: Record<string, string>;
}
interface ForecastRow {
  date: string;
  t2m?: number;
  precip?: number;
  t2m_hi?: number;
  precip_hi?: number;
}
interface ForecastResponse {
  code: number;
  data: { daily: ForecastRow[] };
}

const ACTIVITY_FROM_CATEGORY = (cat: string): Activity => {
  if (cat.startsWith('tourism:beach') || cat.includes('beach')) return 'beach';
  if (cat.startsWith('natural:') || cat === 'leisure:park') return 'hike';
  if (cat.startsWith('tourism:') || cat.startsWith('historic:')) return 'city';
  return 'city';
};

function inRange(d: string, start?: string, end?: string) {
  if (!start && !end) return true;
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
}

function scoreDay(t?: number, r?: number): number {
  if (t == null || r == null) return -1; // missing → punish
  let s = 0;
  if (t >= 22 && t <= 32) s += 2;
  else if ((t >= 20 && t < 22) || (t > 32 && t <= 34)) s += 1;
  if (r < 1) s += 2;
  else if (r <= 5) s += 1;
  if (t > 35) s -= 2;
  if (r > 10) s -= 2;
  return s;
}

@Injectable()
export class PlacesWeatherService {
  constructor(private http: HttpService) {}

  private flaskBase = process.env.FLASK_BASE ?? 'http://127.0.0.1:8000';

  private async forecast(lat: number, lon: number): Promise<ForecastRow[]> {
    const { data } = await firstValueFrom(
      this.http.get<ForecastResponse>(`${this.flaskBase}/forecast`, {
        params: { lat, lon, interp: '1', vars: 'T2M,PRECIP' },
        timeout: 15000,
      }),
    );
    return data.data.daily;
  }

  async filterPlacesByWeather(
    places: Place[],
    window: { start?: string; end?: string }, // YYYY-MM-DD
    opts: { minGoodDays?: number } = {},
  ) {
    const limit = pLimit(6); // control concurrency
    const tasks = places.map((p) =>
      limit(async () => {
        const daily = (await this.forecast(p.lat, p.lon)).filter((d) =>
          inRange(d.date, window.start, window.end),
        );
        const act = ACTIVITY_FROM_CATEGORY(p.category);
        // hard rejects per activity
        const maxRainHi = Math.max(...daily.map((d) => d.precip_hi ?? 0));
        const maxTHi = Math.max(...daily.map((d) => d.t2m_hi ?? -99));
        if (act === 'beach' && (maxRainHi > 15 || maxTHi > 36)) return null;
        if (act === 'hike' && (maxRainHi > 20 || maxTHi > 36)) return null;

        const scores = daily.map((d) => scoreDay(d.t2m, d.precip));
        const goodDays = scores.filter((s) => s >= 3).length; // dry+comfortable
        const minGood = opts.minGoodDays ?? 1;
        if (goodDays < minGood) return null;

        const totalScore = scores.reduce((a, b) => a + b, 0);
        const sumRain = daily.reduce((a, b) => a + (b.precip ?? 0), 0);
        const avgT =
          daily.reduce((a, b) => a + (b.t2m ?? 0), 0) / (daily.length || 1);

        return {
          place: p,
          activity: act,
          score: totalScore,
          summary: {
            goodDays,
            days: daily.length,
            sumRain: +sumRain.toFixed(1),
            avgT: +avgT.toFixed(1),
          },
        };
      }),
    );

    const results = (await Promise.all(tasks)).filter(Boolean) as Array<{
      place: Place;
      activity: Activity;
      score: number;
      summary: any;
    }>;

    // Sort: higher score, then nearer
    return results.sort(
      (a, b) => b.score - a.score || a.place.distance_m - b.place.distance_m,
    );
  }
}
