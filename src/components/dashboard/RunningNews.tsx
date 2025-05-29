'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Newspaper } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';

interface RunningNewsProps {
  cachedNews?: string[];
  onNewsGenerated: (news: string[]) => void;
}

// Placeholder function to simulate fetching news
const getRunningNews = async (): Promise<string[]> => {
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
  return [
    "Local Marathon Sees Record Participation This Year.",
    "New Study Highlights Benefits of Trail Running for Mental Health.",
    "Olympic Runner Shares Tips for Beginners.",
    "Upcoming Running Gear: What's New in 2024?",
  ];
};


export function RunningNews({ cachedNews, onNewsGenerated }: RunningNewsProps) {
  const [newsItems, setNewsItems] = useState<string[] | null>(cachedNews || null);
  const [isLoading, setIsLoading] = useState(!cachedNews);

  useEffect(() => {
    if (cachedNews && cachedNews.length > 0) {
      setNewsItems(cachedNews);
      setIsLoading(false);
      return;
    }

    async function fetchNews() {
      setIsLoading(true);
      try {
        const news = await getRunningNews(); // Replace with actual news fetching
        setNewsItems(news);
        onNewsGenerated(news);
      } catch (error) {
        console.error("Failed to fetch running news:", error);
        const fallback = ["Could not load news. Check back later."];
        setNewsItems(fallback);
        onNewsGenerated(fallback);
      } finally {
        setIsLoading(false);
      }
    }
    if (!newsItems) {
      fetchNews();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cachedNews]);


  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Running News</CardTitle>
        <Newspaper className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ul className="space-y-3">
            <li><Skeleton className="h-4 w-full" /></li>
            <li><Skeleton className="h-4 w-5/6" /></li>
            <li><Skeleton className="h-4 w-3/4" /></li>
          </ul>
        ) : (
          <ul className="space-y-2">
            {newsItems && newsItems.length > 0 ? (
              newsItems.map((item, index) => (
                <li key={index} className="text-sm text-muted-foreground border-b border-border/50 pb-1 last:border-b-0 last:pb-0">
                  {item}
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">No news available at the moment.</li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
