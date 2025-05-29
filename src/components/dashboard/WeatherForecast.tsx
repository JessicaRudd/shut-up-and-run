'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sun, CloudRain, Shirt } from 'lucide-react'; // Example icons
import { Skeleton } from '@/components/ui/skeleton';

interface WeatherForecastProps {
  cachedWeather?: { forecast: string; clothingRecommendation: string };
  onWeatherGenerated: (weather: { forecast: string; clothingRecommendation: string }) => void;
}

// Placeholder function to simulate fetching weather and generating advice
// In a real app, this would call an API and potentially an AI for clothing advice
const getWeatherData = async (): Promise<{ forecast: string; clothingRecommendation: string }> => {
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
  // Dummy data
  const forecasts = [
    { forecast: "Sunny, 25°C. Perfect running weather!", recommendation: "Light t-shirt, shorts, and don't forget sunscreen!" },
    { forecast: "Cloudy, 18°C. Cool and pleasant.", recommendation: "Long-sleeve shirt and running tights or pants." },
    { forecast: "Light rain, 15°C. A bit wet.", recommendation: "Water-resistant jacket, cap, and be mindful of slippery surfaces." },
  ];
  return forecasts[Math.floor(Math.random() * forecasts.length)];
};


export function WeatherForecast({ cachedWeather, onWeatherGenerated }: WeatherForecastProps) {
  const [weatherData, setWeatherData] = useState<{ forecast: string; clothingRecommendation: string } | null>(cachedWeather || null);
  const [isLoading, setIsLoading] = useState(!cachedWeather);
  
  useEffect(() => {
    if (cachedWeather) {
      setWeatherData(cachedWeather);
      setIsLoading(false);
      return;
    }

    async function fetchWeather() {
      setIsLoading(true);
      try {
        const data = await getWeatherData(); // Replace with actual weather fetching & AI call
        setWeatherData(data);
        onWeatherGenerated(data);
      } catch (error) {
        console.error("Failed to fetch weather data:", error);
        const fallback = { forecast: "Could not load weather data.", clothingRecommendation: "Check your local weather app." };
        setWeatherData(fallback);
        onWeatherGenerated(fallback);
      } finally {
        setIsLoading(false);
      }
    }
    if(!weatherData){
      fetchWeather();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cachedWeather]);


  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Weather & Gear</CardTitle>
        {/* Choose an icon based on weather, e.g. weatherData?.forecast.includes("Sun") ? <Sun/> : <CloudRain/> */}
        <Sun className="h-5 w-5 text-accent" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-5 w-3/4 mb-2" />
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
// Need to add useState and useEffect imports
import { useState, useEffect } from 'react';
