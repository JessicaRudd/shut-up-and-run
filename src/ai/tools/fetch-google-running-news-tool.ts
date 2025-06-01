// src/ai/tools/fetch-google-running-news-tool.ts
'use server';
/**
 * @fileOverview A Genkit tool to fetch running news.
 *
 * - fetchGoogleRunningNewsTool - The Genkit tool definition.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { NewsSearchCategory } from '@/lib/types';

// Define the possible enum values for news search categories
const newsSearchCategoryValues: [NewsSearchCategory, ...NewsSearchCategory[]] = [
  "geographic_area", "track_road_trail", "running_tech",
  "running_apparel", "marathon_majors", "nutrition", "training"
];

export const FetchGoogleRunningNewsToolInputSchema = z.object({
  userLocation: z.string().optional().describe('The user location (e.g., city, country) to help tailor news search. Can be an empty string if not available.'),
  searchCategories: z.array(z.enum(newsSearchCategoryValues)).optional().describe('An array of preferred news categories. If empty or undefined, general running news will be fetched.'),
});
export type FetchGoogleRunningNewsToolInput = z.infer<typeof FetchGoogleRunningNewsToolInputSchema>;

const NewsArticleSchema = z.object({
  title: z.string().describe('The title of the news article.'),
  link: z.string().url().describe('The direct URL to the news article.'),
  snippet: z.string().describe('A short snippet or description of the news article content.'),
  source: z.string().optional().describe('The source of the news article (e.g., website name).'),
});
export type NewsArticle = z.infer<typeof NewsArticleSchema>;

export const FetchGoogleRunningNewsToolOutputSchema = z.object({
  articles: z.array(NewsArticleSchema).describe('An array of fetched news articles. Can be empty if no relevant news is found.'),
  error: z.string().optional().describe('An error message if news fetching failed. Undefined if successful.'),
});
export type FetchGoogleRunningNewsToolOutput = z.infer<typeof FetchGoogleRunningNewsToolOutputSchema>;

export const fetchGoogleRunningNewsTool = ai.defineTool(
  {
    name: 'fetchGoogleRunningNewsTool',
    description: 'Fetches recent running-related news articles. Can be tailored by location and categories if provided.',
    inputSchema: FetchGoogleRunningNewsToolInputSchema,
    outputSchema: FetchGoogleRunningNewsToolOutputSchema,
  },
  async (input: FetchGoogleRunningNewsToolInput): Promise<FetchGoogleRunningNewsToolOutput> => {
    // In a real application, this would call a news API (e.g., Google News API, NewsAPI.org)
    // For now, we'll return mock data based on the structure.
    console.log('Fetching news with input:', input);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Mocked articles (replace with actual API call)
    const mockArticles: NewsArticle[] = [
      {
        title: "Record Numbers at the Annual City Marathon",
        link: "https://example.com/news/city-marathon-record",
        snippet: "This year's city marathon saw an unprecedented number of participants, with over 50,000 runners...",
        source: "Local News Hub",
      },
      {
        title: "New Trail Running Shoes Revolutionize Comfort and Grip",
        link: "https://example.com/reviews/new-trail-shoes-2024",
        snippet: "Brand X has just released its latest line of trail running shoes, promising unmatched comfort...",
        source: "RunnersTech Magazine",
      },
      {
        title: "Expert Tips for Improving Your 5K Time",
        link: "https://example.com/articles/improve-5k-time",
        snippet: "Coach Jane Doe shares her top strategies for runners looking to shave seconds off their 5K personal best.",
        source: "Running Performance Blog",
      },
      {
        title: "Nutrition for Endurance: Fueling Your Long Runs",
        link: "https://example.com/guides/endurance-nutrition",
        snippet: "Discover the best foods and hydration strategies to keep you going strong during those challenging long runs.",
        source: "Healthy Runner",
      },
      {
        title: "Local Running Club Announces Summer Race Series",
        link: "https://example.com/events/summer-race-series",
        snippet: `The ${input.userLocation || 'Local'} Gazelles running club has unveiled its exciting lineup of summer races...`,
        source: "Community Sports Calendar",
      },
    ];
    
    // Simulate a case where no articles are found for specific criteria
    if (input.searchCategories?.includes("marathon_majors") && input.userLocation === "RemoteVille") {
         return { articles: [] };
    }

    // Simulate an error case (e.g., API key issue or network problem)
    // if (Math.random() < 0.1) { // 10% chance of error for testing
    //   return { articles: [], error: "Simulated API error: Could not connect to news service." };
    // }

    return { articles: mockArticles.slice(0, 7) }; // Return up to 7 mock articles
  }
);

// Add to dev.ts if not already (or create a new tools/index.ts and import there)
// import './fetch-google-running-news-tool';
