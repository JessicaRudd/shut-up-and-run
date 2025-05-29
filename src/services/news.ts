/**
 * Represents a news article.
 */
export interface NewsArticle {
  /**
   * The title of the article.
   */
  title: string;
  /**
   * The description or snippet of the article.
   */
  description: string;
  /**
   * The URL to the full article.
   */
  url: string;
  /**
   * The URL to the article's image.
   */
  imageUrl?: string;
}

/**
 * Asynchronously retrieves running-related news articles.
 *
 * @returns A promise that resolves to an array of NewsArticle objects.
 */
export async function getRunningNews(): Promise<NewsArticle[]> {
  // TODO: Implement this by calling an API.

  return [
    {
      title: 'Running News 1',
      description: 'Description of running news 1.',
      url: 'https://example.com/news1',
      imageUrl: 'https://example.com/news1.jpg',
    },
    {
      title: 'Running News 2',
      description: 'Description of running news 2.',
      url: 'https://example.com/news2',
      imageUrl: 'https://example.com/news2.jpg',
    },
  ];
}
