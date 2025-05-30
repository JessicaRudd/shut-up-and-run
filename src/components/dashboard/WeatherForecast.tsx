
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, CloudRain, Thermometer, Shirt, Cloud, Snowflake, Wind } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
// import type { DashboardCache } from '@/lib/firebase-schemas'; // Not directly used here for type
import { fetchWeatherFromAPI } from '@/app/actions/weatherActions';

export interface WeatherInfo {
  forecast: string;
  clothingRecommendation: string;
  locationCity?: string;
  weatherUnit?: 'C' | 'F';
}

interface WeatherForecastProps {
  locationCity?: string;
  weatherUnit?: 'C' | 'F';
  cachedWeather?: WeatherInfo;
  onWeatherGenerated: (weather: WeatherInfo) => void;
}

export function WeatherForecast({ locationCity, weatherUnit = 'C', cachedWeather, onWeatherGenerated }: WeatherForecastProps) {
  const [weatherData, setWeatherData] = useState<WeatherInfo | null>(cachedWeather || null);
  const [isLoading, setIsLoading] = useState(!cachedWeather);

  useEffect(() => {
    if (cachedWeather && cachedWeather.locationCity === locationCity && cachedWeather.weatherUnit === weatherUnit) {
      setWeatherData(cachedWeather);
      setIsLoading(false);
      return;
    }

    async function fetchAndSetWeather() {
      if (!locationCity) {
        const noLocationData: WeatherInfo = {
          forecast: "Set a location in your profile for weather updates.",
          clothingRecommendation: "Update profile for clothing advice.",
          locationCity,
          weatherUnit
        };
        setWeatherData(noLocationData);
        onWeatherGenerated(noLocationData); // Cache this state as well
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await fetchWeatherFromAPI(locationCity, weatherUnit);
        setWeatherData(data);
        onWeatherGenerated(data);
      } catch (error) {
        console.error("Failed to fetch weather data via server action:", error);
        const fallback: WeatherInfo = {
            forecast: "Could not load weather data.",
            clothingRecommendation: "Check your local weather app.",
            locationCity,
            weatherUnit
        };
        setWeatherData(fallback);
        onWeatherGenerated(fallback);
      } finally {
        setIsLoading(false);
      }
    }

    // Fetch if no weatherData, or if cache is stale/mismatched, or if locationCity is present but no data yet
     if (!cachedWeather || cachedWeather.locationCity !== locationCity || cachedWeather.weatherUnit !== weatherUnit ) {
        fetchAndSetWeather();
     } else if (cachedWeather) { // Cache is valid and matches
        setWeatherData(cachedWeather);
        setIsLoading(false);
     } else { // No cache, no location means we wait or show prompt
        setIsLoading(false); // Not actively loading if no locationCity
        if (!locationCity) {
             const noLocationData: WeatherInfo = {
                forecast: "Set a location in your profile for weather updates.",
                clothingRecommendation: "Update profile for clothing advice.",
                locationCity,
                weatherUnit
            };
            setWeatherData(noLocationData);
            // Optionally call onWeatherGenerated here if you want "no location" state to be cached
        }
     }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationCity, weatherUnit, cachedWeather]);


  const getIconForForecast = (forecast?: string) => {
    if (!forecast) return Thermometer;
    const lowerForecast = forecast.toLowerCase();
    if (lowerForecast.includes("sun") || lowerForecast.includes("clear")) return Sun;
    if (lowerForecast.includes("rain") || lowerForecast.includes("drizzle")) return CloudRain;
    if (lowerForecast.includes("snow")) return Snowflake;
    if (lowerForecast.includes("wind")) return Wind;
    if (lowerForecast.includes("cloud") || lowerForecast.includes("overcast")) return Cloud;
    return Thermometer;
  };

  const Icon = getIconForForecast(weatherData?.forecast);

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Weather & Gear</CardTitle>
        <Icon className="h-5 w-5 text-accent" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-1/2" />
          </>
        ) : (
          <>
            <p className="text-md font-semibold">{weatherData?.forecast || "Loading weather..."}</p>
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <Shirt className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{weatherData?.clothingRecommendation || "Fetching advice..."}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
