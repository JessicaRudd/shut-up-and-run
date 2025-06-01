
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, CloudRain, Thermometer, Cloud, Snowflake, Wind, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface WeatherForecastProps {
  weatherSummary?: string; // Made optional for loading state
}

export function WeatherForecast({ weatherSummary }: WeatherForecastProps) {
  const isLoading = !weatherSummary;

  const getIconForForecast = (summary?: string) => {
    if (!summary) return Thermometer;
    const lowerForecast = summary.toLowerCase();
    if (lowerForecast.includes("unavailable") || lowerForecast.includes("error")) return AlertTriangle;
    if (lowerForecast.includes("sun") || lowerForecast.includes("clear")) return Sun;
    if (lowerForecast.includes("rain") || lowerForecast.includes("drizzle") || lowerForecast.includes("shower")) return CloudRain;
    if (lowerForecast.includes("snow")) return Snowflake;
    if (lowerForecast.includes("wind")) return Wind; // Less likely as primary descriptor but possible
    if (lowerForecast.includes("cloud") || lowerForecast.includes("overcast")) return Cloud;
    return Thermometer; // Default
  };

  const Icon = getIconForForecast(weatherSummary);

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Weather Insights</CardTitle>
        <Icon className={`h-5 w-5 ${weatherSummary?.toLowerCase().includes("unavailable") ? 'text-destructive' : 'text-accent'}`} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-5 w-full mb-2" />
            <Skeleton className="h-4 w-5/6 mb-1" />
            <Skeleton className="h-4 w-4/6" />
          </>
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {weatherSummary || "Loading weather forecast and running recommendation..."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
