
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Newspaper, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface NewsStory {
  title: string;
  summary: string;
  url: string;
  source?: string;
}

interface RunningNewsProps {
  newsItems?: NewsStory[]; // Made optional for loading state
  planNotification?: string;
}

export function RunningNews({ newsItems, planNotification }: RunningNewsProps) {
  const isLoading = newsItems === undefined; // Undefined means still loading/generating

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg font-medium">Running News & Updates</CardTitle>
          <Newspaper className="h-5 w-5 text-primary" />
        </div>
        {planNotification && (
          <Alert variant="default" className="mt-3 bg-accent/20 border-accent text-accent-foreground">
            <Info className="h-4 w-4 text-accent-foreground" />
            <AlertDescription className="text-sm">{planNotification}</AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent className="pt-0 pb-2">
         <Alert variant="default" className="bg-yellow-100 border-yellow-400 text-yellow-800">
          <Info className="h-4 w-4 text-yellow-800" />
          <AlertTitle>Work in Progress</AlertTitle>
          <AlertDescription className="text-sm">This news section is under development and may not always display relevant or up-to-date information.</AlertDescription>
        </Alert>
      </CardContent>
      <CardContent>
        {isLoading ? (
          <ul className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <li key={i}>
                <Skeleton className="h-5 w-3/4 mb-1" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-5/6" />
              </li>
            ))}
          </ul>
        ) : newsItems && newsItems.length > 0 ? (
          <ul className="space-y-4">
            {newsItems.map((item, index) => (
              <li key={index} className="pb-3 border-b border-border/50 last:border-b-0 last:pb-0">
                <Link href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  <h3 className="font-semibold text-md text-primary/90 leading-tight">{item.title}</h3>
                </Link>
                {item.source && <p className="text-xs text-muted-foreground/80 mt-0.5 mb-1">Source: {item.source}</p>}
                <p className="text-sm text-muted-foreground line-clamp-3">{item.summary}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No running news available at the moment, or the news service encountered an issue. Try checking back later!</p>
        )}
      </CardContent>
    </Card>
  );
}
