
// src/ai/flows/generate-dashboard-content.ts
'use server';
/**
 * @fileOverview Generates comprehensive dashboard content for the RunMate app.
 *
 * - generateDashboardContent - A function that generates all necessary dashboard content.
 * - GenerateDashboardInput - The input type for the function.
 * - GenerateDashboardOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { NewsSearchCategory } from '@/lib/types';
import { fetchGoogleRunningNewsTool } from '@/ai/tools/fetch-google-running-news-tool';
import { generateMotivationalPunTool, type GenerateMotivationalPunToolOutput } from '@/ai/tools/generate-motivational-pun-tool';

// Zod schema for HourlyWeatherData - Internal, not exported
const HourlyWeatherDataSchemaInternal = z.object({
  time: z.string().describe("Time of the forecast segment, e.g., '9:00 AM' or '14:00'"),
  temp: z.number().describe("Temperature for this segment."),
  feelsLike: z.number().describe("Feels like temperature for this segment."),
  description: z.string().describe("Weather description, e.g., 'Light Rain'"),
  pop: z.number().min(0).max(100).describe("Probability of precipitation (0-100%)."),
  windSpeed: z.number().describe("Wind speed in user's preferred unit."),
  windGust: z.number().optional().describe("Wind gust speed."),
  icon: z.string().describe("Weather icon code from OpenWeatherMap."),
});
export type HourlyWeatherData = z.infer<typeof HourlyWeatherDataSchemaInternal>;

// Zod schema for DailyForecastData - Internal, not exported
const DailyForecastDataSchemaInternal = z.object({
  locationName: z.string().describe("Name of the location, e.g., 'London'"),
  date: z.string().describe("Date of the forecast, e.g., 'Tuesday, July 30th'"),
  overallDescription: z.string().describe("A general summary of the day's weather, e.g., 'Cloudy with periods of rain, clearing later.'"),
  tempMin: z.number().describe("Minimum temperature for the day."),
  tempMax: z.number().describe("Maximum temperature for the day."),
  sunrise: z.string().describe("Sunrise time, e.g., '6:00 AM'"),
  sunset: z.string().describe("Sunset time, e.g., '8:30 PM'"),
  humidityAvg: z.number().describe("Average humidity for the day (percentage)."),
  windAvg: z.number().describe("Average wind speed for the day (in user's preferred unit)."),
  hourly: z.array(HourlyWeatherDataSchemaInternal).describe("Array of hourly (or 3-hourly) forecast segments for the day."),
  error: z.string().optional().describe("Error message if fetching forecast failed."),
});
export type DailyForecastData = z.infer<typeof DailyForecastDataSchemaInternal>;

const newsSearchCategoryValues: [NewsSearchCategory, ...NewsSearchCategory[]] = [
  "geographic_area", "track_road_trail", "running_tech",
  "running_apparel", "marathon_majors", "nutrition", "training"
];

// Main input schema for the flow
const GenerateDashboardInputSchemaInternal = z.object({
  userId: z.string().describe("The user's unique ID."),
  userName: z.string().describe('The name of the user.'),
  locationCity: z.string().describe('The city of the user for weather and potentially geographic news search.'),
  runningLevel: z.string().describe('The running level of the user (e.g., beginner, intermediate, advanced).'),
  goal: z.string().describe('The primary training goal of the user (e.g., 5k, Marathon).'),
  todaysWorkout: z.string().describe("The workout scheduled for the user for the current day. Could be 'Rest day' or a specific workout description."),
  detailedWeather: z.union([
    DailyForecastDataSchemaInternal,
    z.object({ error: z.string(), locationName: z.string().optional() }).describe("An object containing an error message if weather data retrieval failed.")
  ]).describe("The structured daily weather forecast for the user's location, or an error object if retrieval failed."),
  weatherUnit: z.enum(["C", "F"]).describe("The user's preferred weather unit (Celsius or Fahrenheit)."),
  newsSearchCategories: z.array(z.enum(newsSearchCategoryValues)).optional().describe("User's preferred categories for news search. Can be empty or undefined if no preferences are set."),
});
export type GenerateDashboardInput = z.infer<typeof GenerateDashboardInputSchemaInternal>;

// Dress My Run Item schema - Used in output
const DressMyRunItemSchemaInternal = z.object({
  item: z.string().describe("The specific clothing item recommended, e.g., 'Lightweight, moisture-wicking t-shirt' or 'Sunglasses'."),
  category: z.string().describe("The general category of the clothing item. Examples: hat, visor, sunglasses, headband, shirt, tank-top, long-sleeve, base-layer, mid-layer, jacket, vest, windbreaker, rain-jacket, shorts, capris, tights, pants, gloves, mittens, socks, shoes, gaiter, balaclava, accessory."),
});
export type DressMyRunItem = z.infer<typeof DressMyRunItemSchemaInternal>;

// Main output schema for the flow
const GenerateDashboardOutputSchemaInternal = z.object({
  greeting: z.string().describe('A friendly greeting with a running-related pun, generated by the generateMotivationalPunTool.'),
  weatherSummary: z.string().describe("A user-friendly summary of the day's local weather forecast, including a recommendation for the best time to run based on the provided hourly data. If weather data is unavailable or an error occurred, this should state so clearly and include the specific error message."),
  workoutForDisplay: z.string().describe("The workout scheduled for the user for the current day, ready for display. This is typically the same as todaysWorkout input."),
  topStories: z
    .array(
      z.object({
        title: z.string().describe('The title of the summarized article.'),
        summary: z.string().describe('A concise summary of the article snippet from the search result. If the original snippet is short, the summary might be very similar to it.'),
        url: z.string().url().describe('The URL of the article from the search tool.'),
        source: z.string().optional().describe('The source of the news article (e.g., website name).'),
      })
    )
    .max(5) // Ensure we don't exceed 5 stories
    .describe('An array of up to 5 summarized news stories from the fetchGoogleRunningNewsTool. If no news stories were found or an error occurred with the news tool, this MUST be an empty array.'),
  planEndNotification: z.string().nullable().optional().describe("A message if the user's training plan has ended (e.g., if todaysWorkout indicates plan completion)."),
  dressMyRunSuggestion: z.array(DressMyRunItemSchemaInternal).describe('A DETAILED, ITEMIZED list of clothing recommendations based on weather at the recommended run time. Each item must be an object with "item" (string) and "category" (string). If weather is unavailable, this should be an empty array.'),
});
export type GenerateDashboardOutput = z.infer<typeof GenerateDashboardOutputSchemaInternal>;


export async function generateDashboardContent(input: GenerateDashboardInput): Promise<GenerateDashboardOutput> {
  return generateDashboardContentFlow(input);
}

const dashboardPrompt = ai.definePrompt({
  name: 'generateDashboardContentPrompt',
  input: { schema: GenerateDashboardInputSchemaInternal },
  output: { schema: GenerateDashboardOutputSchemaInternal },
  tools: [
    generateMotivationalPunTool,
    fetchGoogleRunningNewsTool
  ],
  prompt: [
    'You are an AI assistant for "Shut Up and Run", a running companion app. Your task is to generate all content for the user\\\'s daily dashboard.',
    '',
    'User Details:',
    '- Name: {{{userName}}}',
    '- Location: {{{locationCity}}}',
    '- Running Level: {{{runningLevel}}}',
    '- Goal: {{{goal}}}',
    '- Today\\\'s Workout: {{{todaysWorkout}}}',
    '- Weather Unit: {{{weatherUnit}}}',
    '- Detailed Weather Data or Error (as JSON string): {{{detailedWeatherString}}}',
    '- News Search Categories (as JSON string): {{{newsSearchCategoriesString}}}',
    '',
    'Your response MUST be a single JSON object strictly adhering to the GenerateDashboardOutputSchema.',
    '',
    'Follow these steps precisely:',
    '',
    '1.  **Greeting (\\\'greeting\\\' field):**',
    '    *   Use the \\\'generateMotivationalPunTool\\\' to create a personalized greeting.',
    '    *   The tool expects: { "userName": "{{{userName}}}" }',
    '    *   The tool returns: { "greeting": "string" }',
    '    *   Use the returned \\\'greeting\\\' for this field in your JSON output.',
    '',
    '2.  **Weather Summary & Running Recommendation (\\\'weatherSummary\\\' field):**',
    '    *   The input \\\'detailedWeather\\\' (represented as \\\'detailedWeatherString\\\' here, which is a JSON string of the original structured data) contains either full forecast data or an error object.',
    '    *   Parse \\\'detailedWeatherString\\\' to access its properties.',
    '    *   **If \\\'detailedWeather.error\\\' exists in the parsed object**: ',
    '        *   The \\\'weatherSummary\\\' field MUST BE: "Weather forecast for {{{locationCity}}} is currently unavailable: {{{parsedDetailedWeather.error}}}".',
    '        *   In this case, \\\'dressMyRunSuggestion\\\' MUST be an empty array ([]).',
    '    *   **Otherwise (if \\\'detailedWeather.hourly\\\' exists and no error in the parsed object)**:',
    '        *   a. **Daily Overview**: Start with "Today in {{{parsedDetailedWeather.locationName}}} ({{{parsedDetailedWeather.date}}}), expect {{{parsedDetailedWeather.overallDescription}}}."',
    '        *   b. **Temperature & Sun**: Seamlessly continue with: "High of {{{parsedDetailedWeather.tempMax}}}{{{weatherUnit}}}, low of {{{parsedDetailedWeather.tempMin}}}{{{weatherUnit}}}. Sunrise: {{{parsedDetailedWeather.sunrise}}}, Sunset: {{{parsedDetailedWeather.sunset}}}. Avg Humidity: {{{parsedDetailedWeather.humidityAvg}}}%."',
    '        *   c. **Best Run Time**: Analyze \\\'parsedDetailedWeather.hourly\\\' (fields: \\\'time\\\', \\\'temp\\\', \\\'feelsLike\\\', \\\'description\\\', \\\'pop\\\', \\\'windSpeed\\\') to find the BEST time slot(s) to run. Prioritize:',
    '            *   Lowest \\\'pop\\\' (chance of precipitation).',
    '            *   Moderate \\\'feelsLike\\\' temperatures (avoid extremes).',
    '            *   Lower \\\'windSpeed\\\'.',
    '            *   Generally, daytime hours unless conditions are significantly better at dawn/dusk.',
    '        *   d. **Recommendation Text**: Append to the summary: " The best time for your run looks to be [recommended time, e.g., \\\'around 7 AM\\\' or \\\'between 4 PM and 6 PM\\\'] because [brief explanation, e.g., \\\'temperatures will be cooler and chance of rain is lowest.\\\' or \\\'it offers a good balance of mild temperatures and lower winds.\\\']."',
    '        *   Combine a, b, and d into a single, coherent paragraph for \\\'weatherSummary\\\'.',
    '',
    '3.  **Workout for Display (\\\'workoutForDisplay\\\' field):**',
    '    *   Use the exact string provided in \\\'{{{todaysWorkout}}}\\\'.',
    '',
    '4.  **Top News Stories (\\\'topStories\\\' field):**',
    '    *   Use the \\\'fetchGoogleRunningNewsTool\\\'.',
    '    *   The \\\'newsSearchCategoriesString\\\' is a JSON string of the user\\\'s preferred categories. Parse it for the tool.',
    '    *   The tool call will use { "userLocation": "{{{locationCity}}}", "searchCategories": <parsed_news_search_categories_array_or_empty_if_none> }',
    '    *   The tool is expected to return: { "articles": [{ "title": "...", "link": "...", "snippet": "...", "source": "..." }, ...], "error": "optional_error_message" }',
    '    *   **CRITICAL**: If the tool call results in an \\\'error\\\' in its output OR if the \\\'articles\\\' array from the tool is missing, empty, or null, then the \\\'topStories\\\' field in YOUR JSON output MUST be an empty array ([]). Do NOT invent news articles.',
    '    *   If articles are available from the tool:',
    '        *   Directly use the articles provided by the tool for the \\\'topStories\\\' field. The tool is expected to provide up to 5 relevant articles with title, link (URL), snippet (summary), and source.',
    '        *   Ensure all URLs in the articles from the tool are treated as valid for output.',
    '        *   The \\\'summary\\\' field in your output should be the \\\'snippet\\\' from the tool.',
    '',
    '5.  **Plan End Notification (\\\'planEndNotification\\\' field, optional):**',
    '    *   If \\\'{{{todaysWorkout}}}\\\' contains phrases like "plan completed", "final workout", or "congratulations on finishing your plan", include a positive message like: "Congratulations on completing your training plan, {{{userName}}}! Time to set a new goal?"',
    '    *   Otherwise, omit this field or set to undefined/null.',
    '',
    '6.  **Dress Your Run Suggestion (\\\'dressMyRunSuggestion\\\' field):**',
    '    *   This MUST be a JSON array of objects, each like: { "item": "Specific clothing item", "category": "general_category_from_list" }.',
    '    *   The category MUST be one of: hat, visor, sunglasses, headband, shirt, tank-top, long-sleeve, base-layer, mid-layer, jacket, vest, windbreaker, rain-jacket, shorts, capris, tights, pants, gloves, mittens, socks, shoes, gaiter, balaclava, accessory.',
    '    *   **If \\\'detailedWeather.error\\\' exists in parsed \\\'detailedWeatherString\\\'**: \\\'dressMyRunSuggestion\\\' MUST be an empty array ([]).',
    '    *   **Otherwise**: Based on the weather conditions (temp, feelsLike, pop, windSpeed, description) at the \\\'best time to run\\\' you identified in step 2c from the parsed detailed weather, provide a DETAILED, ITEMIZED list of clothing recommendations. Be specific (e.g., "Lightweight, moisture-wicking t-shirt" not just "shirt"). Consider layers if needed.',
    '',
    'Ensure the final output is a single, valid JSON object matching the schema.',
    'Assume the LLM can infer properties from the JSON strings provided for detailedWeatherString and newsSearchCategoriesString.'
  ].join('\\n'),
});

const generateDashboardContentFlow = ai.defineFlow(
  {
    name: 'generateDashboardContentFlow',
    inputSchema: GenerateDashboardInputSchemaInternal,
    outputSchema: GenerateDashboardOutputSchemaInternal,
  },
  async (input: GenerateDashboardInput): Promise<GenerateDashboardOutput> => {
    const promptInput = {
      ...input,
      detailedWeatherString: JSON.stringify(input.detailedWeather),
      newsSearchCategoriesString: input.newsSearchCategories ? JSON.stringify(input.newsSearchCategories) : '[]',
    };

    try {
      const { output, errors } = await dashboardPrompt(promptInput);

      // Errors during prompt generation can be logged if needed in future

      if (!output) {
        throw new Error("AI prompt did not produce output");
      }

      if (!output.topStories || !Array.isArray(output.topStories)) {
          output.topStories = [];
      } else {
          output.topStories = output.topStories.filter(story => {
              if (typeof story !== 'object' || story === null) return false;
              const hasValidFields =
                  typeof story.title === 'string' && story.title.trim() !== '' &&
                  typeof story.summary === 'string' &&
                  typeof story.url === 'string' &&
                  (typeof story.source === 'string' || story.source === undefined);

              if (!hasValidFields) {
                  return false;
              }
              try {
                  new URL(story.url);
              } catch (e) {
                   // console.warn(`[generateDashboardContentFlow] Filtering out story with invalid URL: "${story.url}" Title: "${story.title}"`);
                   console.warn('[generateDashboardContentFlow] Filtering out story with invalid URL: "' + story.url + '" Title: "' + story.title + '"');
                  return false;
              }
              return true;
          }).slice(0, 5);
      }

      if (!output.dressMyRunSuggestion || !Array.isArray(output.dressMyRunSuggestion)) {
          output.dressMyRunSuggestion = [];
      } else {
          output.dressMyRunSuggestion = output.dressMyRunSuggestion.filter(item =>
              typeof item === 'object' && item !== null &&
              'item' in item && typeof item.item === 'string' && item.item.trim() !== '' &&
              'category' in item && typeof item.category === 'string' && item.category.trim() !== ''
          );
      }

      const weatherInputOriginal = input.detailedWeather;
      const weatherHasErrorOriginal = typeof weatherInputOriginal === 'object' && weatherInputOriginal && 'error' in weatherInputOriginal && typeof (weatherInputOriginal as any).error === 'string' && (weatherInputOriginal as any).error.length > 0;
      if (weatherHasErrorOriginal && output.dressMyRunSuggestion.length > 0) {
          output.dressMyRunSuggestion = [];
      }

      if (output.planEndNotification === undefined || (typeof output.planEndNotification === 'string' && output.planEndNotification.trim() === '')) {
        output.planEndNotification = null;
      }

      return output;
    } catch (error) {
      console.error("[generateDashboardContentFlow] Error during main AI prompt execution, attempting fallback:", error);
      let fallbackGreeting = 'Hello ' + input.userName + ', your personalized dashboard content could not be generated by the AI at this time.';
      try {
        const greetingResult: GenerateMotivationalPunToolOutput = await generateMotivationalPunTool({ userName: input.userName });
        if (greetingResult && greetingResult.greeting) {
          fallbackGreeting = greetingResult.greeting;
        }
      } catch (greetingError) {
        // Fallback greeting generation error can be logged if needed
      }

      let fallbackWeatherSummary: string;
      const weatherInput = input.detailedWeather;
      const weatherHasError = typeof weatherInput === 'object' && weatherInput && 'error' in weatherInput && typeof (weatherInput as any).error === 'string' && (weatherInput as any).error.length > 0;

      if (weatherHasError) {
        fallbackWeatherSummary = 'Weather forecast for ' + (input.locationCity || 'your location') + ' is currently unavailable: ' + (weatherInput as any).error;
      } else {
        fallbackWeatherSummary = 'Could not generate weather summary and running recommendation for ' + (input.locationCity || 'your location') + ' at this time due to an AI processing issue. Please check back later.';
      }

      const fallbackWorkout = input.todaysWorkout || "No workout information available.";

      let fallbackTopStories: GenerateDashboardOutput['topStories'] = [];
      try {
        const newsToolResult = await fetchGoogleRunningNewsTool({
          userLocation: input.locationCity,
          searchCategories: input.newsSearchCategories,
        });
        if (newsToolResult && newsToolResult.articles) {
          fallbackTopStories = newsToolResult.articles.map(article => ({
            title: article.title,
            summary: article.snippet,
            url: article.link,
            source: article.source,
          }));
        }
      } catch (newsError) {
        // Fallback news fetching error can be logged if needed
      }

      const fallbackResult: GenerateDashboardOutput = {
        greeting: fallbackGreeting,
        weatherSummary: fallbackWeatherSummary,
        workoutForDisplay: fallbackWorkout,
        topStories: fallbackTopStories,
        planEndNotification: null,
        dressMyRunSuggestion: [],
      };
      return fallbackResult;
    }
  }
);
