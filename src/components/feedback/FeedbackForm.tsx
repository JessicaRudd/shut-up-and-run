
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase'; // Added useFirestore, useUser, addDocumentNonBlocking
import { collection } from 'firebase/firestore'; // Added collection
import type { FeedbackSubmission } from '@/lib/firebase-schemas'; // Import the new type

const feedbackFormSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }).optional(),
  email: z.string().email({ message: 'Invalid email address.' }).optional(),
  feedbackType: z.enum(['bug', 'feature', 'general', 'compliment']),
  message: z.string().min(10, { message: 'Feedback message must be at least 10 characters.' }),
});

type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;

// Pre-fill with user's name/email if available (from useUser hook)
interface FeedbackFormProps {
  userName?: string;
  userEmail?: string;
}

export function FeedbackForm({ userName, userEmail }: FeedbackFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { user: authUser } = useUser(); // Get the authenticated user

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      name: userName || '',
      email: userEmail || '',
      feedbackType: 'general',
      message: '',
    },
  });

  const onSubmit = async (data: FeedbackFormValues) => {
    setIsSubmitting(true);

    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not connect to the database. Please try again later.',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const feedbackData: FeedbackSubmission = {
        userId: authUser?.uid || undefined, // Store UID if user is logged in
        userName: data.name || undefined,
        userEmail: data.email || undefined,
        feedbackType: data.feedbackType,
        message: data.message,
        submittedAt: new Date().toISOString(),
      };

      const feedbackCollectionRef = collection(firestore, 'feedback');
      addDocumentNonBlocking(feedbackCollectionRef, feedbackData); // Non-blocking add

      toast({
        title: 'Feedback Submitted!',
        description: "Thanks for helping us improve Shut Up and Run.",
      });
      form.reset({ name: userName || '', email: userEmail || '', feedbackType: 'general', message: '' });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'Could not submit feedback. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>Submit Feedback</CardTitle>
        <CardDescription>We value your input! Let us know what you think.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="feedbackType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feedback Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select feedback type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">General Feedback</SelectItem>
                      <SelectItem value="bug">Bug Report</SelectItem>
                      <SelectItem value="feature">Feature Request</SelectItem>
                      <SelectItem value="compliment">Compliment</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea rows={5} placeholder="Your feedback message..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Feedback
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
