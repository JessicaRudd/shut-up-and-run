'use server';

import type { WeatherInfo } from '@/components/dashboard/WeatherForecast'; // Assuming type export from component

interface OpenWeatherMapResponse {
  weather: {
    main: string;
    description: string;
    icon: string;
  }[];
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  wind: {
    speed: number;
    deg: number;
  };
  sys: {
    country: string;
    sunrise: number;
    sunset: number;
  };
  name: string; // City name
  cod: number | string; // HTTP status code
  message?: string; // Error message
}

function generateClothingRecommendation(temp: number, unit: 'C' | 'F', condition: string): string {
  let recommendation = "Dress in layers.";
  const isFahrenheit = unit === 'F';

  if (condition.toLowerCase().includes("rain")) {
    recommendation = "Water-resistant jacket is a good idea. ";
  } else if (condition.toLowerCase().includes("snow")) {
    recommendation = "Warm, waterproof layers are essential. ";
  }

  if (isFahrenheit) {
    if (temp > 75) recommendation += "Light t-shirt and shorts. Don't forget sunscreen!";
    else if (temp > 60) recommendation += "Long-sleeve shirt and running tights or pants.";
    else if (temp > 45) recommendation += "Warm jacket, hat, and gloves might be needed.";
    else recommendation += "Very cold! Multiple layers, hat, gloves, and consider indoor options.";
  } else { // Celsius
    if (temp > 24) recommendation += "Light t-shirt and shorts. Don't forget sunscreen!";
    else if (temp > 15) recommendation += "Long-sleeve shirt and running tights or pants.";
    else if (temp > 7) recommendation += "Warm jacket, hat, and gloves might be needed.";
    else recommendation += "Very cold! Multiple layers, hat, gloves, and consider indoor options.";
  }
  return recommendation;
}

export async function fetchWeatherFromAPI(
  locationCity: string,
  weatherUnit: 'C' | 'F' = 'C'
): Promise<WeatherInfo> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  if (!apiKey) {
    console.error("OpenWeatherMap API key is missing.");
    return {
      forecast: "Weather service unavailable (no API key).",
      clothingRecommendation: "Could not retrieve weather-based clothing advice.",
      locationCity,
      weatherUnit,
    };
  }

  if (!locationCity) {
     return {
      forecast: "Please set a location in your profile for weather updates.",
      clothingRecommendation: "Set location for clothing advice.",
      locationCity,
      weatherUnit,
    };
  }

  const units = weatherUnit === 'F' ? 'imperial' : 'metric';
  const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(locationCity)}&appid=${apiKey}&units=${units}`;

  try {
    const response = await fetch(apiUrl);
    const data: OpenWeatherMapResponse = await response.json();

    if (data.cod !== 200) {
      console.error("OpenWeatherMap API error:", data.message);
      return {
        forecast: `Could not fetch weather for ${locationCity}: ${data.message || 'Unknown error'}`,
        clothingRecommendation: "Unable to provide clothing advice.",
        locationCity,
        weatherUnit,
      };
    }

    const conditionDescription = data.weather[0]?.description || 'N/A';
    const temp = Math.round(data.main.temp);
    
    const forecastString = `${conditionDescription.charAt(0).toUpperCase() + conditionDescription.slice(1)}, ${temp}°${weatherUnit} in ${data.name}.`;
    const clothingRec = generateClothingRecommendation(temp, weatherUnit, conditionDescription);

    return {
      forecast: forecastString,
      clothingRecommendation: clothingRec,
      locationCity: data.name, // Use city name from API response for consistency
      weatherUnit,
    };
  } catch (error) {
    console.error("Failed to fetch weather data from OpenWeatherMap:", error);
    return {
      forecast: "Could not connect to weather service.",
      clothingRecommendation: "Unable to provide clothing advice due to connection error.",
      locationCity,
      weatherUnit,
    };
  }
}
