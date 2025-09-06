// src/weather/forecast.service.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

/** ---------- Types local to this file (exported so the controller can reuse) ---------- */
export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

export type Mode = 'snapped' | 'interpolated';
export interface LatLon {
  lat: number;
  lon: number;
}

export interface LocationInfo {
  requested?: LatLon;
  snapped?: LatLon | null;
  mode?: Mode;
  neighbors?: LatLon[];
}

export interface ForecastWindow {
  start: string;
  end: string;
}

export interface ForecastDaily {
  date: string;
  // Temperature
  t2m?: number;
  t2m_lo?: number;
  t2m_hi?: number;
  t2m_model?: string;
  // Rainfall
  precip?: number;
  precip_lo?: number;
  precip_hi?: number;
  precip_model?: string;
}

export interface ForecastPayload {
  location: LocationInfo;
  forecast_window: ForecastWindow;
  daily: ForecastDaily[];
}

export interface HistoryDaily {
  date: string;
  t2m?: number | null;
  precip?: number | null;
  t2m_model?: string;
  precip_model?: string;
}

export interface HistoryPayload {
  location: LocationInfo;
  daily: HistoryDaily[];
}

/** ===== OpenWeather types & normalized shape ===== */
export interface CurrentWeather {
  source: 'openweather';
  at: string; // ISO UTC from dt
  at_local?: string; // ISO local (dt + timezone)
  lat: number;
  lon: number;
  name?: string;
  tz_offset?: number; // seconds
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed?: number;
  wind_deg?: number;
  clouds?: number;
  rain_1h?: number;
  rain_3h?: number;
  description?: string;
  icon?: string;
}

// minimal subset of raw OpenWeather response we use
interface OWMResp {
  coord: { lon: number; lat: number };
  weather: { id: number; main: string; description: string; icon: string }[];
  main: {
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
  };
  wind?: { speed?: number; deg?: number };
  clouds?: { all?: number };
  rain?: { '1h'?: number; '3h'?: number };
  dt: number;
  timezone?: number; // seconds
  name?: string;
}
/** ------------------------------------------------------------------------------------ */

@Injectable()
export class ForecastService {
  /** Flask (your Python service) */
  private readonly flaskBase: string;
  private readonly flaskTimeoutMs: number;
  private readonly flaskRetries: number;
  private readonly flaskBackoffMs: number;

  /** OpenWeather */
  private readonly owBase: string;
  private readonly owKey?: string;
  private readonly owUnits: string;
  private readonly owTimeoutMs: number;
  private readonly owRetries: number;
  private readonly owBackoffMs: number;

  constructor(
    private readonly http: HttpService,
    private readonly cfg: ConfigService,
  ) {
    // -------- Flask config --------
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

    // -------- OpenWeather config --------
    this.owBase =
      this.cfg.get<string>('OPENWEATHER_BASE') ??
      'https://api.openweathermap.org/data/2.5';
    this.owKey = this.cfg.get<string>('OPENWEATHER_API_KEY');
    this.owUnits = this.cfg.get<string>('OPENWEATHER_UNITS') ?? 'metric';
    this.owTimeoutMs = this.num(
      this.cfg.get<string>('OPENWEATHER_TIMEOUT_MS'),
      12_000,
    );
    this.owRetries = this.num(this.cfg.get<string>('OPENWEATHER_RETRIES'), 1);
    this.owBackoffMs = this.num(
      this.cfg.get<string>('OPENWEATHER_RETRY_BACKOFF_MS'),
      600,
    );
  }

  /** safe number parse with fallback */
  private num(v: unknown, fallback: number): number {
    const n = typeof v === 'string' ? Number(v) : (v as number);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  }

  /** Generic retry with exponential backoff */
  private async withRetry<T>(
    op: () => Promise<T>,
    retries: number,
    backoffMs: number,
  ): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await op();
      } catch (e) {
        lastErr = e;
        if (attempt === retries) break;
        const wait = backoffMs * Math.pow(2, attempt); // 0.8s, 1.6s, 3.2s...
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    throw lastErr;
  }

  /** ---------------- Flask-backed endpoints ---------------- */

  async forecastByCoords(
    lat: number,
    lon: number,
    opts: { date?: string; vars?: string; interp?: '0' | '1' } = {},
  ): Promise<ApiEnvelope<ForecastPayload>> {
    const params: Record<string, string | number> = {
      lat,
      lon,
      interp: opts.interp ?? '1',
    };
    if (opts.date) params.date = opts.date;
    if (opts.vars) params.vars = opts.vars;

    const url = `${this.flaskBase}/forecast`;
    const { data } = await this.withRetry(
      () =>
        firstValueFrom(
          this.http.get<ApiEnvelope<ForecastPayload>>(url, {
            params,
            timeout: this.flaskTimeoutMs,
          }),
        ),
      this.flaskRetries,
      this.flaskBackoffMs,
    );
    return data;
  }

  async historyByCoords(
    lat: number,
    lon: number,
    date: string,
    opts: { vars?: string; interp?: '0' | '1' } = {},
  ): Promise<ApiEnvelope<HistoryPayload>> {
    const params: Record<string, string | number> = {
      lat,
      lon,
      date,
      interp: opts.interp ?? '1',
    };
    if (opts.vars) params.vars = opts.vars;

    const url = `${this.flaskBase}/history`;
    const { data } = await this.withRetry(
      () =>
        firstValueFrom(
          this.http.get<ApiEnvelope<HistoryPayload>>(url, {
            params,
            timeout: this.flaskTimeoutMs,
          }),
        ),
      this.flaskRetries,
      this.flaskBackoffMs,
    );
    return data;
  }

  /** ---------------- Current (OpenWeather) ---------------- */

  async currentByCoords(
    lat: number,
    lon: number,
  ): Promise<ApiEnvelope<CurrentWeather>> {
    if (!this.owKey) {
      throw new Error('OPENWEATHER_API_KEY is not set');
    }

    const url = `${this.owBase}/weather`;
    const { data } = await this.withRetry(
      () =>
        firstValueFrom(
          this.http.get<OWMResp>(url, {
            params: { lat, lon, appid: this.owKey!, units: this.owUnits },
            timeout: this.owTimeoutMs,
          }),
        ),
      this.owRetries,
      this.owBackoffMs,
    );

    const atUtc = new Date((data.dt ?? 0) * 1000);
    const atLocal = new Date(((data.dt ?? 0) + (data.timezone ?? 0)) * 1000);

    const out: CurrentWeather = {
      source: 'openweather',
      at: atUtc.toISOString(),
      at_local: atLocal.toISOString(),
      lat: data.coord?.lat ?? lat,
      lon: data.coord?.lon ?? lon,
      name: data.name,
      tz_offset: data.timezone,
      temp: data.main?.temp,
      feels_like: data.main?.feels_like,
      humidity: data.main?.humidity,
      pressure: data.main?.pressure,
      wind_speed: data.wind?.speed,
      wind_deg: data.wind?.deg,
      clouds: data.clouds?.all,
      rain_1h: data.rain?.['1h'],
      rain_3h: data.rain?.['3h'],
      description: data.weather?.[0]?.description,
      icon: data.weather?.[0]?.icon,
    };

    return { code: 200, message: 'OK', data: out };
  }
}