// src/app/actions/weatherActions.ts
'use server';

import type { DailyForecastData, HourlyWeatherData } from '@/ai/flows/generate-dashboard-content'; // Use types from the new flow
import type { OpenWeatherMapOneCallResponse, OpenWeatherMapHourlyUnit, OpenWeatherMapDailyUnit } from '@/lib/types'; // Raw API response types
import { format, fromUnixTime } from 'date-fns';

// Helper to convert OpenWeatherMap icon code to a more generic category if needed, or just pass through
// const mapIconToCategory = (iconCode: string): string => {
//   // Simple mapping, can be expanded
//   if (iconCode.includes('01')) return 'clear'; // 01d, 01n
//   if (iconCode.includes('02') || iconCode.includes('03') || iconCode.includes('04')) return 'cloudy'; // few, scattered, broken clouds
//   if (iconCode.includes('09') || iconCode.includes('10')) return 'rain'; // shower rain, rain
//   if (iconCode.includes('11')) return 'thunderstorm';
//   if (iconCode.includes('13')) return 'snow';
//   if (iconCode.includes('50')) return 'mist';
//   return 'unknown';
// };


function transformToHourlyWeatherData(
  owmHourly: OpenWeatherMapHourlyUnit[],
  timezoneOffset: number, // in seconds
  unit: 'C' | 'F'
): HourlyWeatherData[] {
  return owmHourly.slice(0, 24).map(hour => { // Typically take next 24 hours
    const localTime = fromUnixTime(hour.dt + timezoneOffset); // Adjust to local time using full timezone offset
    return {
      time: format(localTime, 'h:mm a'), // e.g., 9:00 AM
      temp: Math.round(hour.temp),
      feelsLike: Math.round(hour.feels_like),
      description: hour.weather[0]?.description || 'N/A',
      pop: Math.round((hour.pop || 0) * 100), // Convert 0-1 to 0-100
      windSpeed: Math.round(hour.wind_speed),
      windGust: hour.wind_gust ? Math.round(hour.wind_gust) : undefined,
      icon: hour.weather[0]?.icon || '01d', // Default icon
    };
  });
}


export async function fetchDetailedWeather(
  locationCity: string,
  weatherUnit: 'C' | 'F' = 'C'
): Promise<DailyForecastData | { error: string; locationName?: string }> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  if (!apiKey) {
    console.error("OpenWeatherMap API key is missing.");
    return { error: "Weather service unavailable (no API key).", locationName: locationCity };
  }

  if (!locationCity) {
     return { error: "Location not set.", locationName: locationCity };
  }

  // Step 1: Get coordinates for the city
  const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(locationCity)}&limit=1&appid=${apiKey}`;
  let lat: number | undefined;
  let lon: number | undefined;
  let preciseLocationName = locationCity;

  try {
    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json();
    if (geoData && geoData.length > 0) {
      lat = geoData[0].lat;
      lon = geoData[0].lon;
      preciseLocationName = geoData[0].name; // Use more precise name from API
    } else {
      return { error: `City "${locationCity}" not found.`, locationName: locationCity };
    }
  } catch (error) {
    console.error("Failed to fetch coordinates from OpenWeatherMap Geocoding:", error);
    return { error: "Could not fetch location coordinates.", locationName: locationCity };
  }

  if (lat === undefined || lon === undefined) {
     return { error: "Could not determine coordinates for location.", locationName: locationCity };
  }

  // Step 2: Get detailed weather using One Call API
  const units = weatherUnit === 'F' ? 'imperial' : 'metric';
  // Exclude minutely, current, alerts to simplify if not needed for this specific use case
  const oneCallUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&appid=${apiKey}&units=${units}`;

  try {
    const weatherResponse = await fetch(oneCallUrl);
    const data: OpenWeatherMapOneCallResponse = await weatherResponse.json();

    if (!weatherResponse.ok || !data.daily || !data.hourly || !data.daily[0]) {
        // Handle cases where OWM API returns an error object like { cod: "401", message: "Invalid API key..." }
        // or if critical data parts are missing.
        const errorMsg = (data as any).message || `Failed to fetch weather data (status: ${weatherResponse.status})`;
        console.error("OpenWeatherMap One Call API error:", errorMsg, data);
        return { error: errorMsg, locationName: preciseLocationName };
    }
    
    const todayForecast = data.daily[0];
    const timezoneOffset = data.timezone_offset || 0; // UTC offset in seconds

    const transformedHourly = data.hourly ? transformToHourlyWeatherData(data.hourly, timezoneOffset, weatherUnit) : [];

    return {
      locationName: preciseLocationName, // From geo API or OneCall
      date: format(fromUnixTime(todayForecast.dt + timezoneOffset), 'EEEE, MMMM do'), // e.g., Tuesday, July 30th
      overallDescription: todayForecast.summary || todayForecast.weather[0]?.description || 'No description',
      tempMin: Math.round(todayForecast.temp.min),
      tempMax: Math.round(todayForecast.temp.max),
      sunrise: format(fromUnixTime(todayForecast.sunrise + timezoneOffset), 'h:mm a'),
      sunset: format(fromUnixTime(todayForecast.sunset + timezoneOffset), 'h:mm a'),
      humidityAvg: Math.round(todayForecast.humidity),
      windAvg: Math.round(todayForecast.wind_speed),
      hourly: transformedHourly,
    };

  } catch (error) {
    console.error("Failed to fetch detailed weather data from OpenWeatherMap One Call:", error);
    return { error: "Could not connect to weather service for detailed forecast.", locationName: preciseLocationName };
  }
}
