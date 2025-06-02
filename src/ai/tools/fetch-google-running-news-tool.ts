// src/ai/tools/fetch-google-running-news-tool.ts
'use server';
/**
 * @fileOverview A Genkit tool to fetch running news using an LLM.
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
    description: 'Generates recent running-related news articles using AI. Can be tailored by location and categories if provided.',
    inputSchema: FetchGoogleRunningNewsToolInputSchema,
    outputSchema: FetchGoogleRunningNewsToolOutputSchema,
  },
  async (input: FetchGoogleRunningNewsToolInput): Promise<FetchGoogleRunningNewsToolOutput> => {
    const { userLocation, searchCategories } = input;
    let searchQuery = "recent top running news";
    if (searchCategories && searchCategories.length > 0) {
      searchQuery += ` focusing on ${searchCategories.join(", ")}`;
    }
    if (userLocation && userLocation.trim() !== "" && userLocation.toLowerCase() !== "not set") {
      searchQuery += ` relevant to ${userLocation}`;
    }

    const newsPrompt = `You are a news aggregation assistant. Provide up to 5 recent and relevant running news articles based on the following interest: "${searchQuery}".
For each article, structure it with:
- title: A concise and engaging headline.
- link: A plausible, generic placeholder URL (e.g., https://example-news.com/story-slug).
- snippet: A brief 1-2 sentence summary of what the article is about.
- source: A plausible source name (e.g., "Running Today Magazine", "Global Athletics News").

Return *only* a JSON array of these article objects. If no relevant articles are found, return an empty array.
Example of a single article object:
{ "title": "Marathon Season Kicks Off", "link": "https://example-news.com/marathon-season", "snippet": "Runners worldwide are preparing as the spring marathon season begins, with major events scheduled in several key cities.", "source": "World Running Digest" }
`;

    try {
      const ExpectedLLMOutputSchema = z.array(NewsArticleSchema);
      const { output: generatedArticles, errors: generationErrors } = await ai.generate({
        prompt: newsPrompt,
        output: {
          format: 'json',
          schema: ExpectedLLMOutputSchema
        },
        config: { temperature: 0.4 } // Slightly lower temperature for more factual-sounding news
      });

      if (generationErrors && generationErrors.length > 0) {
        console.error("[fetchGoogleRunningNewsTool] LLM generation errors:", generationErrors);
        const errorMessages = generationErrors.map(e => typeof e === 'string' ? e : (e as Error).message || 'Unknown generation error').join('; ');
        return { articles: [], error: `AI generation failed: ${errorMessages}` };
      }

      if (generatedArticles && Array.isArray(generatedArticles)) {
        const validatedArticles = generatedArticles.filter(
          article => article.title && article.link && article.snippet && article.source
        ).map(article => ({
            ...article,
            link: (article.link && (article.link.startsWith('http://') || article.link.startsWith('https://'))) ? article.link : `https://example-news.com/article/${encodeURIComponent(article.title.substring(0,30).replace(/\s+/g, '-').toLowerCase())}`
        })).slice(0, 5); // Ensure max 5
        return { articles: validatedArticles };
      } else {
        console.warn("[fetchGoogleRunningNewsTool] LLM did not return articles in the expected array format or output was null. Raw output:", generatedArticles);
        return { articles: [], error: "AI returned no articles or unexpected format." };
      }
    } catch (error) { // Catch errors from ai.generate call itself (e.g., network, service unavailable)
      console.error("[fetchGoogleRunningNewsTool] Exception during LLM call:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { articles: [], error: `Error fetching news from AI: ${errorMessage}` };
    }
  }
);
