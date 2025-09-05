import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { LoggerModule } from 'nestjs-pino';
import { WeatherModule } from './weather/weather.module';
import { PlacesModule } from './places/places.module';
import { TripPlanModule } from './trip-plan/trip-plan.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UserModule,
    AuthModule,
    LoggerModule.forRoot(),
    WeatherModule,
    PlacesModule,
    TripPlanModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
