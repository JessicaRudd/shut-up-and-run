// src/ai/tools/generate-motivational-pun-tool.ts
'use server';
/**
 * @fileOverview A Genkit tool to generate a motivational pun greeting.
 *
 * - generateMotivationalPunTool - The Genkit tool definition.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateMotivationalPunToolInputSchema = z.object({
  userName: z.string().describe('The name of the user for a personalized greeting.'),
});
export type GenerateMotivationalPunToolInput = z.infer<typeof GenerateMotivationalPunToolInputSchema>;

const GenerateMotivationalPunToolOutputSchema = z.object({
  greeting: z.string().describe('A motivational greeting including a running-related pun.'),
});
export type GenerateMotivationalPunToolOutput = z.infer<typeof GenerateMotivationalPunToolOutputSchema>;

export const generateMotivationalPunTool = ai.defineTool(
  {
    name: 'generateMotivationalPunTool',
    description: 'Generates a friendly, motivational greeting with a running-related pun for the user.',
    inputSchema: GenerateMotivationalPunToolInputSchema,
    outputSchema: GenerateMotivationalPunToolOutputSchema,
  },
  async (input: GenerateMotivationalPunToolInput): Promise<GenerateMotivationalPunToolOutput> => {
    // Logic from the original generateMotivationalPunFlow
    const punText = await ai.generate({
        prompt: 'Generate a short, witty, running-related pun.',
        config: {
            // Reduced temperature for more focused puns, can be adjusted
            temperature: 0.6,
        }
    }).then(res => res.text);

    // Constructing a slightly more varied greeting structure
    const greetingsTemplates = [
        `Hey ${input.userName}, ready to hit the pavement? Remember: ${punText}`,
        `Hello ${input.userName}! Here's a little something to get you moving: ${punText}`,
        `Hi ${input.userName}, time to lace up! And here's a thought: ${punText}`,
        `${input.userName}, let's get those legs moving! Quick pun for you: ${punText}`
    ];
    const selectedTemplate = greetingsTemplates[Math.floor(Math.random() * greetingsTemplates.length)];

    return { greeting: selectedTemplate };
  }
);
