'use client';

import { useEffect, useState } from 'react';
import { generateMotivationalPun } from '@/ai/flows/generate-motivational-pun';
import type { User as AppUser } from '@/lib/firebase-schemas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb } from 'lucide-react';

interface MotivationalGreetingProps {
  user: AppUser | null;
  cachedGreeting?: string;
  onGreetingGenerated: (greeting: string) => void;
}

export function MotivationalGreeting({ user, cachedGreeting, onGreetingGenerated }: MotivationalGreetingProps) {
  const [greeting, setGreeting] = useState<string | null>(cachedGreeting || null);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedGreeting);

  useEffect(() => {
    if (cachedGreeting) {
      setGreeting(cachedGreeting);
      setIsLoading(false);
      return;
    }

    async function fetchGreeting() {
      if (user?.firstName) {
        setIsLoading(true);
        try {
          const result = await generateMotivationalPun({ userName: user.firstName });
          setGreeting(result.greeting);
          onGreetingGenerated(result.greeting);
        } catch (error) {
          console.error("Failed to generate motivational pun:", error);
          setGreeting("Have a great run today!"); // Fallback greeting
          onGreetingGenerated("Have a great run today!");
        } finally {
          setIsLoading(false);
        }
      } else {
        // Fallback if user name is not available
        const defaultGreeting = "Ready to hit the road? Let's go!";
        setGreeting(defaultGreeting);
        onGreetingGenerated(defaultGreeting);
        setIsLoading(false);
      }
    }

    if (!greeting) {
       fetchGreeting();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cachedGreeting]); // userName might change if profile is updated

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Hey {user?.firstName || 'Runner'}!</CardTitle>
        <Lightbulb className="h-5 w-5 text-accent" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-6 w-3/4" />
        ) : (
          <p className="text-md text-muted-foreground">{greeting}</p>
        )}
      </CardContent>
    </Card>
  );
}
