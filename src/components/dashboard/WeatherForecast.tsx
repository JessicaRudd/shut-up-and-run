
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, CloudRain, Shirt, Thermometer } from 'lucide-react'; 
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardCache } from '@/lib/firebase-schemas';


interface WeatherInfo {
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

// Placeholder function to simulate fetching weather and generating advice
const getWeatherData = async (locationCity?: string, weatherUnit: 'C' | 'F' = 'C'): Promise<WeatherInfo> => {
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
  
  const tempC = Math.floor(Math.random() * 20) + 10; // Random temp between 10-29 C
  const tempF = Math.round(tempC * 9/5 + 32);
  const displayTemp = weatherUnit === 'F' ? tempF : tempC;

  const conditions = ["Sunny", "Cloudy", "Partly Cloudy", "Light Rain"];
  const currentCondition = conditions[Math.floor(Math.random() * conditions.length)];
  
  let recommendation = "Dress in layers.";
  if (displayTemp > (weatherUnit === 'F' ? 75 : 24)) recommendation = "Light t-shirt, shorts, and don't forget sunscreen!";
  else if (displayTemp > (weatherUnit === 'F' ? 60 : 15)) recommendation = "Long-sleeve shirt and running tights or pants.";
  else if (displayTemp > (weatherUnit === 'F' ? 45 : 7)) recommendation = "Warm jacket, hat, and gloves might be needed.";
  else recommendation = "Very cold! Multiple layers, hat, gloves, and consider indoor options.";

  if (currentCondition.includes("Rain")) recommendation += " Add a water-resistant jacket.";

  return {
    forecast: `${currentCondition}, ${displayTemp}°${weatherUnit} in ${locationCity || 'your area'}.`,
    clothingRecommendation: recommendation,
    locationCity: locationCity,
    weatherUnit: weatherUnit,
  };
};


export function WeatherForecast({ locationCity, weatherUnit = 'C', cachedWeather, onWeatherGenerated }: WeatherForecastProps) {
  const [weatherData, setWeatherData] = useState<WeatherInfo | null>(cachedWeather || null);
  const [isLoading, setIsLoading] = useState(!cachedWeather);
  
  useEffect(() => {
    // If cache exists and matches current profile settings, use it
    if (cachedWeather && cachedWeather.locationCity === locationCity && cachedWeather.weatherUnit === weatherUnit) {
      setWeatherData(cachedWeather);
      setIsLoading(false);
      return;
    }

    // Otherwise, fetch new data
    async function fetchWeather() {
      setIsLoading(true);
      try {
        const data = await getWeatherData(locationCity, weatherUnit);
        setWeatherData(data);
        onWeatherGenerated(data);
      } catch (error) {
        console.error("Failed to fetch weather data:", error);
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
    
    // Fetch if no weatherData or if location/unit changed from cache
    if (!weatherData || weatherData.locationCity !== locationCity || weatherData.weatherUnit !== weatherUnit) {
        fetchWeather();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationCity, weatherUnit, cachedWeather]); // onWeatherGenerated removed to prevent potential loops if it causes parent re-render


  const Icon = weatherData?.forecast?.includes("Sun") ? Sun : weatherData?.forecast?.includes("Rain") ? CloudRain : Thermometer;

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
            <p className="text-md font-semibold">{weatherData?.forecast}</p>
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <Shirt className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{weatherData?.clothingRecommendation}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

