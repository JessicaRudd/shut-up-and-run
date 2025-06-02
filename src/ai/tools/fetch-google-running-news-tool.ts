// src/ai/tools/fetch-google-running-news-tool.ts
'use server';
/**
 * @fileOverview A Genkit tool to fetch running news using the Google Custom Search API.
 *
 * - fetchGoogleRunningNewsTool - The Genkit tool definition.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { NewsSearchCategory } from '@/lib/types';

const newsSearchCategoryValues: [NewsSearchCategory, ...NewsSearchCategory[]] = [
  "geographic_area", "track_road_trail", "running_tech",
  "running_apparel", "marathon_majors", "nutrition", "training"
];

const FetchGoogleRunningNewsToolInputSchema = z.object({
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

const FetchGoogleRunningNewsToolOutputSchema = z.object({
  articles: z.array(NewsArticleSchema).describe('An array of fetched news articles. Can be empty if no relevant news is found.'),
  error: z.string().optional().describe('An error message if news fetching failed. Undefined if successful.'),
});
export type FetchGoogleRunningNewsToolOutput = z.infer<typeof FetchGoogleRunningNewsToolOutputSchema>;

export const fetchGoogleRunningNewsTool = ai.defineTool(
  {
    name: 'fetchGoogleRunningNewsTool',
    description: 'Fetches recent running-related news articles using the Google Custom Search API. Can be tailored by location and categories if provided.',
    inputSchema: FetchGoogleRunningNewsToolInputSchema,
    outputSchema: FetchGoogleRunningNewsToolOutputSchema,
  },
  async (input: FetchGoogleRunningNewsToolInput): Promise<FetchGoogleRunningNewsToolOutput> => {
    const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      console.error("[fetchGoogleRunningNewsTool] Google Custom Search API Key or Search Engine ID is missing in .env.local.");
      return { articles: [], error: "News service is not configured. API Key or Search Engine ID missing." };
    }

    const { userLocation, searchCategories } = input;
    let query = "running news";

    if (searchCategories && searchCategories.length > 0) {
      const categoryQuery = searchCategories
        .map(cat => cat.replace(/_/g, ' ')) // Replace underscores for better search terms
        .join(" OR "); // Use OR for multiple categories to broaden search
      query += ` (${categoryQuery})`;
    }

    if (userLocation && userLocation.trim() !== "" && userLocation.toLowerCase() !== "not set") {
      query += ` in ${userLocation}`;
    }

    const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=5&sort=date`; // Get top 5, sort by date if possible (CSE feature)

    try {
      const response = await fetch(apiUrl);
      const responseData = await response.json();

      if (!response.ok) {
        const apiError = responseData?.error?.message || `HTTP error! status: ${response.status}`;
        console.error(`[fetchGoogleRunningNewsTool] API Error: ${response.status}`, responseData);
        return { articles: [], error: `Error fetching news from Google: ${apiError}` };
      }
      
      if (responseData.error) {
          console.error("[fetchGoogleRunningNewsTool] Google Search API returned an error in JSON payload:", responseData.error);
          return { articles: [], error: `Google Search API error: ${responseData.error.message || 'Unknown error from API.'}` };
      }

      if (!responseData.items || responseData.items.length === 0) {
        console.log("[fetchGoogleRunningNewsTool] No articles found for query:", query);
        return { articles: [] }; // No articles found
      }

      const articles: NewsArticle[] = responseData.items.map((item: any) => {
        let source = "Unknown Source";
        if (item.pagemap?.metatags?.[0]?.['og:site_name']) {
          source = item.pagemap.metatags[0]['og:site_name'];
        } else if (item.displayLink) {
          source = item.displayLink;
        } else if (item.link) {
          try {
            source = new URL(item.link).hostname.replace(/^www\./, '');
          } catch { /* ignore invalid URL for hostname extraction */ }
        }
        
        return {
          title: item.title || "No title",
          link: item.link || "#",
          snippet: item.snippet || "No snippet available.",
          source: source,
        };
      }).filter((article: NewsArticle) => article.link !== "#"); // Filter out articles with no link

      return { articles };
    } catch (error) {
      console.error("[fetchGoogleRunningNewsTool] Exception during API call:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      return { articles: [], error: `Error processing news request: ${errorMessage}` };
    }
  }
);
