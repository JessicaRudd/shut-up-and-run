// src/lib/types.ts

// Define news search categories based on the example flow
export type NewsSearchCategory =
  | "geographic_area"
  | "track_road_trail"
  | "running_tech"
  | "running_apparel"
  | "marathon_majors"
  | "nutrition"
  | "training";

// Raw OpenWeatherMap API response structures (can be expanded as needed)
// This helps in typing the response from fetchWeatherFromAPI before it's transformed
// into the Zod schema format for the Genkit flow.

export interface OpenWeatherMapHourlyUnit {
  dt: number; // Timestamp
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  dew_point: number;
  uvi: number;
  clouds: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  wind_gust?: number;
  weather: {
    id: number;
    main: string;
    description: string;
    icon: string;
  }[];
  pop: number; // Probability of precipitation (0-1 range, multiply by 100 for percentage)
}

export interface OpenWeatherMapDailyUnit {
  dt: number; // Timestamp
  sunrise: number;
  sunset: number;
  moonrise: number;
  moonset: number;
  moon_phase: number;
  summary?: string; // Optional summary often provided by OWM One Call
  temp: {
    day: number;
    min: number;
    max: number;
    night: number;
    eve: number;
    morn: number;
  };
  feels_like: {
    day: number;
    night: number;
    eve: number;
    morn: number;
  };
  pressure: number;
  humidity: number;
  dew_point: number;
  wind_speed: number;
  wind_deg: number;
  wind_gust?: number;
  weather: {
    id: number;
    main: string;
    description: string;
    icon: string;
  }[];
  clouds: number;
  pop: number; // Probability of precipitation (0-1 range)
  uvi: number;
  rain?: number; // Rain volume for the last hour, mm
  snow?: number; // Snow volume for the last hour, mm
}

export interface OpenWeatherMapOneCallResponse {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  current?: OpenWeatherMapHourlyUnit; // Current weather data
  minutely?: {
    dt: number;
    precipitation: number;
  }[];
  hourly?: OpenWeatherMapHourlyUnit[];
  daily?: OpenWeatherMapDailyUnit[];
  alerts?: {
    sender_name: string;
    event: string;
    start: number;
    end: number;
    description: string;
    tags: string[];
  }[];
}
