// src/ai/flows/generate-daily-workout.ts
'use server';
/**
 * @fileOverview Generates a daily workout plan based on user profile and training schedule.
 *
 * - generateDailyWorkout - A function that generates a daily workout plan.
 * - GenerateDailyWorkoutInput - The input type for the generateDailyWorkout function.
 * - GenerateDailyWorkoutOutput - The return type for the generateDailyWorkout function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDailyWorkoutInputSchema = z.object({
  userProfile: z
    .string()
    .describe('The user profile, including fitness level, goals, and preferences.'),
  trainingSchedule: z.string().describe('The user training schedule.'),
  date: z.string().describe('The date for which to generate the workout.'),
});
export type GenerateDailyWorkoutInput = z.infer<typeof GenerateDailyWorkoutInputSchema>;

const GenerateDailyWorkoutOutputSchema = z.object({
  workoutPlan: z
    .string()
    .describe('A detailed workout plan for the day, considering user profile and schedule.'),
});
export type GenerateDailyWorkoutOutput = z.infer<typeof GenerateDailyWorkoutOutputSchema>;

export async function generateDailyWorkout(input: GenerateDailyWorkoutInput): Promise<GenerateDailyWorkoutOutput> {
  return generateDailyWorkoutFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDailyWorkoutPrompt',
  input: {schema: GenerateDailyWorkoutInputSchema},
  output: {schema: GenerateDailyWorkoutOutputSchema},
  prompt: `You are a personal running coach. Based on the user's profile and training schedule, generate a detailed workout plan for the specified date.

User Profile: {{{userProfile}}}
Training Schedule: {{{trainingSchedule}}}
Date: {{{date}}}

Workout Plan:`, // The training plan output will go here
});

const generateDailyWorkoutFlow = ai.defineFlow(
  {
    name: 'generateDailyWorkoutFlow',
    inputSchema: GenerateDailyWorkoutInputSchema,
    outputSchema: GenerateDailyWorkoutOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
