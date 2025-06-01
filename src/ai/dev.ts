
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-motivational-pun.ts';
import '@/ai/flows/generate-training-plan.ts';
import '@/ai/flows/generate-daily-workout.ts';
import '@/ai/flows/suggest-workout-when-no-plan.ts';
// Add new flows and tools
import '@/ai/tools/generate-motivational-pun-tool.ts';
import '@/ai/tools/fetch-google-running-news-tool.ts';
import '@/ai/flows/generate-dashboard-content.ts';
