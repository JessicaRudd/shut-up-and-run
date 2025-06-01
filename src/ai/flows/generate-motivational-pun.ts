'use server';

/**
 * @fileOverview Generates a motivational pun related to running.
 *
 * - generateMotivationalPun - A function that generates a motivational pun.
 * - MotivationalPunInput - The input type for the generateMotivationalPun function.
 * - MotivationalPunOutput - The return type for the generateMotivationalPun function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MotivationalPunInputSchema = z.object({
  userName: z.string().describe('The name of the user.'),
});
export type MotivationalPunInput = z.infer<typeof MotivationalPunInputSchema>;

const MotivationalPunOutputSchema = z.object({
  greeting: z.string().describe('A motivational greeting including a running-related pun.'),
});
export type MotivationalPunOutput = z.infer<typeof MotivationalPunOutputSchema>;

export async function generateMotivationalPun(input: MotivationalPunInput): Promise<MotivationalPunOutput> {
  return generateMotivationalPunFlow(input);
}

const prompt = ai.definePrompt({
  name: 'motivationalPunPrompt',
  input: {schema: MotivationalPunInputSchema},
  output: {schema: MotivationalPunOutputSchema},
  prompt: `Hello {{userName}}, here is a motivational message with a running-related pun to start your day:\n\n{{ generatePun }}`,
  tools: [],
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ],
  },
});

const generateMotivationalPunFlow = ai.defineFlow(
  {
    name: 'generateMotivationalPunFlow',
    inputSchema: MotivationalPunInputSchema,
    outputSchema: MotivationalPunOutputSchema,
  },
  async input => {
    const {output} = await prompt({
      ...input,
      generatePun: await ai.generate({
        prompt: 'Generate a short, running-related pun.',
      }).then(res => res.text),
    });
    return output!;
  }
);
