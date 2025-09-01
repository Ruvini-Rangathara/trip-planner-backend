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
  constructor(
    private http: HttpService,
    private cfg: ConfigService,
  ) {}

  private base(): string {
    return this.cfg.get<string>('FLASK_BASE') ?? 'http://127.0.0.1:8000';
  }

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

    const { data } = await firstValueFrom(
      this.http.get<ApiEnvelope<ForecastPayload>>(this.base() + '/forecast', {
        params,
      }),
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

    const { data } = await firstValueFrom(
      this.http.get<ApiEnvelope<HistoryPayload>>(this.base() + '/history', {
        params,
      }),
    );
    return data;
  }

  /** Current weather from OpenWeather (by coordinates) */
  async currentByCoords(
    lat: number,
    lon: number,
  ): Promise<ApiEnvelope<CurrentWeather>> {
    const base =
      this.cfg.get<string>('OPENWEATHER_BASE') ??
      'https://api.openweathermap.org/data/2.5';
    const key = this.cfg.get<string>('OPENWEATHER_API_KEY');
    const units = this.cfg.get<string>('OPENWEATHER_UNITS') ?? 'metric';
    if (!key) throw new Error('OPENWEATHER_API_KEY is not set');

    const { data } = await firstValueFrom(
      this.http.get<OWMResp>(`${base}/weather`, {
        params: { lat, lon, appid: key, units },
      }),
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
