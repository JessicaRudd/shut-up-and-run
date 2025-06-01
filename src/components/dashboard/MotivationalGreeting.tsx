
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb } from 'lucide-react';

interface MotivationalGreetingProps {
  greeting?: string; // Made optional for loading state
  userName?: string;
}

export function MotivationalGreeting({ greeting, userName }: MotivationalGreetingProps) {
  const isLoading = !greeting;

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Hey {userName || 'Runner'}!</CardTitle>
        <Lightbulb className="h-5 w-5 text-accent" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-6 w-3/4" />
        ) : (
          <p className="text-md text-muted-foreground whitespace-pre-line">{greeting}</p>
        )}
      </CardContent>
    </Card>
  );
}
