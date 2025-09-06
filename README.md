# Ceylon Guide - Trip Planner Backend

## Overview

Ceylon Guide is a comprehensive trip planning application that helps users discover and plan trips in Sri Lanka with weather-aware recommendations. The backend is built with NestJS and provides RESTful APIs for user management, weather forecasting, place suggestions, and trip planning.

## 🚀 Features

### User Management
- User registration and authentication with JWT
- User profile management with travel preferences
- Secure password hashing with bcrypt

### Weather Services
- **30-day weather forecasts** using NASA POWER data via Flask ML service
- **Historical weather data** for specific dates
- **Current weather conditions** from OpenWeather API
- Support for both coordinates and place name queries
- Bilinear interpolation for accurate village-level forecasts

### Places & Recommendations
- **Nearby POI discovery** using Overpass API (OpenStreetMap)
- **Weather-aware suggestions** that filter places based on forecasted conditions
- Support for various place types: tourism, natural, historic, parks
- Geocoding services for Sri Lankan locations

### Trip Planning
- Create and manage trip plans with multiple destinations
- Track trip status (Planned, Ongoing, Completed)
- Area-based trip organization with geographic coordinates
- Soft delete functionality for data recovery

## 🛠️ Technology Stack

### Backend Framework
- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe development
- **Prisma** - Database ORM with PostgreSQL
- **JWT** - Authentication and authorization

### External Services
- **Flask ML Service** - Weather forecasting and prediction models
- **OpenWeather API** - Current weather conditions
- **Overpass API** - OpenStreetMap data for places
- **Nominatim** - Geocoding services

### Database
- **PostgreSQL** - Primary relational database
- **Prisma Client** - Type-safe database access

## 📦 Project Structure

```
src/
├── common/                 # Shared utilities and modules
│   ├── decorator/         # Custom decorators (Auth, Validation)
│   ├── exception/         # Exception handling and factories
│   ├── prisma/           # Database configuration
│   └── util/             # Utility functions
├── user/                  # User management module
│   ├── dto/              # Data transfer objects
│   ├── user.controller.ts
│   ├── user.service.ts
│   └── user.module.ts
├── weather/               # Weather services module
│   ├── dto/              # Weather DTOs
│   ├── forecast.controller.ts
│   ├── forecast.service.ts
│   ├── geocode.service.ts
│   └── weather.module.ts
├── places/                # Places and recommendations module
│   ├── dto/              # Places DTOs
│   ├── overpass.service.ts
│   ├── places-suggest.service.ts
│   ├── places.controller.ts
│   └── places.module.ts
├── trip-plan/             # Trip planning module
│   ├── dto/              # Trip DTOs
│   ├── trip-plan.controller.ts
│   ├── trip-plan.service.ts
│   └── trip-plan.module.ts
└── app.module.ts          # Root application module
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Python Flask service for weather forecasting
- Redis (optional, for caching)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ruvini-Rangathara/trip-planner-backend.git
   cd trip-planner-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file based on `.env.example`:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/ceylon_guide"
   JWT_SECRET="your-jwt-secret-key"
   FLASK_BASE="http://localhost:8000"
   OPENWEATHER_API_KEY="your-openweather-api-key"
   NOMINATIM_BASE="https://nominatim.openstreetmap.org"
   OVERPASS_BASE="https://overpass-api.de/api/interpreter"
   ```

4. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the application**
   ```bash
   # Development
   npm run start:dev

   # Production
   npm run build
   npm run start:prod
   ```

## 📚 API Documentation

Once the application is running, access the API documentation at:
- **Swagger UI**: http://localhost:9062/ceylon-guide/api/docs
- **Health Check**: http://localhost:9062/ceylon-guide/api/health

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## 🌤️ Weather Forecasting

The weather service provides three types of data:

1. **30-day Forecast**: Predictions for temperature and precipitation
2. **Historical Data**: Past weather conditions for specific dates
3. **Current Weather**: Real-time conditions from OpenWeather

### Example Weather Request
```http
POST /ceylon-guide/api/weather/forecast/by-name?q=Ella&date=2024-09-15
```

## 🗺️ Places & Suggestions

The places service helps users discover interesting locations:

- **Nearby Places**: Find points of interest within a radius
- **Weather-aware Suggestions**: Get recommendations based on forecasted weather conditions
- **Geocoding**: Convert place names to coordinates

### Example Suggestion Request
```http
POST /ceylon-guide/api/places/suggest?lat=6.9271&lon=79.8612&radius=20000
```

## ✈️ Trip Planning

Create and manage travel itineraries:

- **Multi-destination trips** with geographic areas
- **Trip status tracking** (Planned, Ongoing, Completed)
- **Weather integration** for trip planning

### Example Trip Creation
```http
POST /ceylon-guide/api/trip-plans/create
Content-Type: application/json

{
  "title": "Family trip to Kandy",
  "userId": "user-uuid",
  "date": "2024-09-13T00:00:00.000Z",
  "areas": [
    {
      "area": "Kandy",
      "lat": 7.2906,
      "lng": 80.6337
    }
  ]
}
```

## 🧪 Testing

Run the test suite:

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📊 Database Schema

The application uses PostgreSQL with the following main tables:

- **User**: User accounts and preferences
- **TripPlan**: Trip itineraries and metadata
- **TripArea**: Geographic areas within trips

## 🔧 Configuration

Key configuration options in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 9062 |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | Secret for JWT signing | - |
| `FLASK_BASE` | Flask ML service URL | http://localhost:8000 |
| `OPENWEATHER_API_KEY` | OpenWeather API key | - |
| `NOMINATIM_BASE` | Geocoding service URL | https://nominatim.openstreetmap.org |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, please open an issue in the GitHub repository or contact the development team.

## 🙏 Acknowledgments

- NASA POWER for historical weather data
- OpenStreetMap for geographic data
- OpenWeather for current weather data
- NestJS team for the excellent framework

---

**Ceylon Guide** - Making trip planning in Sri Lanka smarter with weather-aware recommendations! 🌴☀️🌧️