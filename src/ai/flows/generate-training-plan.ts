
// src/ai/flows/generate-training-plan.ts
'use server';
/**
 * @fileOverview Generates a personalized training plan based on user profile information.
 *
 * - generateTrainingPlan - A function that generates a training plan.
 * - GenerateTrainingPlanInput - The input type for the generateTrainingPlan function.
 * - GenerateTrainingPlanOutput - The return type for the generateTrainingPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const daysOfWeekEnum = z.enum(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);

const GenerateTrainingPlanInputSchema = z.object({
  fitnessLevel: z
    .enum(['Beginner', 'Intermediate', 'Advanced'])
    .describe('The user running level: Beginner, Intermediate, or Advanced.'),
  runningExperience: z
    .string()
    .describe('Description of the users running experience.'),
  goal: z
    .enum(["5K", "10K", "Half Marathon", "Marathon", "50K/Ultramarathon"])
    .describe('The users goal race distance (e.g., 5K, 10K, Half Marathon, Marathon, 50K/Ultramarathon).'),
  daysPerWeek: z
    .number()
    .int()
    .min(1)
    .max(7)
    .describe('The number of days per week the user can train.'),
  startDate: z
    .string()
    .describe('The start date for the training plan (YYYY-MM-DD).'),
  endDate: z
    .string()
    .describe('The end date for the training plan (YYYY-MM-DD). This is calculated based on duration or target race date.'),
  targetRaceDate: z
    .string()
    .optional()
    .describe('The optional target race date (YYYY-MM-DD). If provided, the plan will be built around this date.'),
  preferredLongRunDay: daysOfWeekEnum
    .optional()
    .describe('The user preferred day for long runs (e.g., Sunday).'),
  additionalNotes: z
    .string()
    .optional()
    .describe('Any additional notes or preferences from the user.'),
});
export type GenerateTrainingPlanInput = z.infer<typeof GenerateTrainingPlanInputSchema>;

const GenerateTrainingPlanOutputSchema = z.object({
  trainingPlan: z
    .string()
    .describe('A detailed training plan, including specific workouts for each day. Each day\'s entry MUST start with "YYYY-MM-DD: " format.'),
});
export type GenerateTrainingPlanOutput = z.infer<typeof GenerateTrainingPlanOutputSchema>;

export async function generateTrainingPlan(input: GenerateTrainingPlanInput): Promise<GenerateTrainingPlanOutput> {
  return generateTrainingPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTrainingPlanPrompt',
  input: {schema: GenerateTrainingPlanInputSchema},
  output: {schema: GenerateTrainingPlanOutputSchema},
  prompt: `You are a personal running coach who specializes in generating training plans for runners of all abilities.

  Based on the following information, generate a detailed training plan for the user.

  Running Level: {{{fitnessLevel}}}
  Running Experience: {{{runningExperience}}}
  Goal: {{{goal}}}
  Days Per Week: {{{daysPerWeek}}}
  Start Date: {{{startDate}}}
  {{#if targetRaceDate}}
  Target Race Date: {{{targetRaceDate}}}
  {{else}}
  Calculated End Date for Plan: {{{endDate}}}
  {{/if}}
  {{#if preferredLongRunDay}}
  Preferred Long Run Day: {{{preferredLongRunDay}}}
  {{/if}}
  Additional Notes: {{{additionalNotes}}}

  The training plan should include specific workouts for each day, formatted clearly.
  IMPORTANT: Each day's entry MUST start with the date in YYYY-MM-DD format, followed by a colon and a space (e.g., "2024-08-01: Easy Run - 30 minutes").
  Subsequent lines for the same day (e.g., details, notes) should not have a date prefix but should be clearly associated with that day's entry.
  Include:
  - Type of workout (e.g., easy run, tempo run, interval training, long run, rest)
  - Distance or duration of the workout
  - Pace or intensity of the workout
  - Any additional instructions or notes

  The training plan should be formatted for readability (e.g. using markdown-like list for workout details under each date).
  Organize the plan by weeks (e.g., "Week 1", "Week 2", etc.) as main headers if appropriate for the plan length.
  Ensure the plan is tailored to the user's running level, experience, goal, and the number of days per week they can train.
  {{#if preferredLongRunDay}}
  If possible, schedule the weekly long run on the user's Preferred Long Run Day: {{{preferredLongRunDay}}}. If it's not feasible for a particular week due to the training structure (e.g., a race or specific recovery needs), choose the next most appropriate day and briefly note why if it deviates significantly from the preference.
  {{/if}}
  {{#if targetRaceDate}}
  Structure the plan to build towards the Target Race Date. The plan must end on or just before the Target Race Date.
  {{else}}
  Consider the start and end dates to create a plan that progressively increases in difficulty over the specified duration.
  {{/if}}
  Take into account any additional notes or preferences from the user.
  Use a friendly, encouraging tone.
  DO NOT INCLUDE ANY INFORMATION ABOUT YOURSELF, ONLY INCLUDE THE TRAINING PLAN.
  `,
});

const generateTrainingPlanFlow = ai.defineFlow(
  {
    name: 'generateTrainingPlanFlow',
    inputSchema: GenerateTrainingPlanInputSchema,
    outputSchema: GenerateTrainingPlanOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
