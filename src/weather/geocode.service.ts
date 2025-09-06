import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

/** Type local to this file and exported */
export interface GeocodeHit {
  name: string;
  lat: number;
  lon: number;
}

@Injectable()
export class GeocodeService {
  constructor(
    private http: HttpService,
    private cfg: ConfigService,
  ) {}

  async geocodeLK(q: string): Promise<GeocodeHit> {
    const base =
      this.cfg.get<string>('NOMINATIM_BASE') ??
      'https://nominatim.openstreetmap.org';
    const ua = this.cfg.get<string>('USER_AGENT') ?? 'villagecast/1.0';
    const params = {
      q,
      format: 'jsonv2',
      countrycodes: 'lk',
      limit: 1,
      viewbox: '79.5,10.1,82.1,5.8', // Sri Lanka bbox (left,top,right,bottom)
      bounded: 1,
    };

    const { data } = await firstValueFrom(
      this.http.get<any[]>(base + '/search', {
        params,
        headers: { 'User-Agent': ua },
      }),
    );

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Place not found in Sri Lanka');
    }
    const item = data[0] as { display_name: string; lat: string; lon: string };
    return {
      name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    };
  }
}
