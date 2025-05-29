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

const GenerateTrainingPlanInputSchema = z.object({
  fitnessLevel: z
    .enum(['Beginner', 'Intermediate', 'Advanced'])
    .describe('The user fitness level: Beginner, Intermediate, or Advanced.'),
  runningExperience: z
    .string()
    .describe('Description of the users running experience.'),
  goal: z
    .string()
    .describe('The users goal, such as completing a 5k, 10k, half marathon, or marathon.'),
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
    .describe('The end date for the training plan (YYYY-MM-DD).'),
  additionalNotes: z
    .string()
    .optional()
    .describe('Any additional notes or preferences from the user.'),
});
export type GenerateTrainingPlanInput = z.infer<typeof GenerateTrainingPlanInputSchema>;

const GenerateTrainingPlanOutputSchema = z.object({
  trainingPlan: z
    .string()
    .describe('A detailed training plan, including specific workouts for each day.'),
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

  Fitness Level: {{{fitnessLevel}}}
  Running Experience: {{{runningExperience}}}
  Goal: {{{goal}}}
  Days Per Week: {{{daysPerWeek}}}
  Start Date: {{{startDate}}}
  End Date: {{{endDate}}}
  Additional Notes: {{{additionalNotes}}}

  The training plan should include specific workouts for each day, including:
  - Type of workout (e.g., easy run, tempo run, interval training, long run, rest)
  - Distance or duration of the workout
  - Pace or intensity of the workout
  - Any additional instructions or notes

  The training plan should be formatted for readability.
  Ensure the plan is tailored to the user's fitness level, experience, goal, and the number of days per week they can train.
  Consider the start and end dates to create a plan that progressively increases in difficulty.
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
