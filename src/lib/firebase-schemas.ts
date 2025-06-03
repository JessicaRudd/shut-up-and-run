
import { z } from 'zod';
import type { DressMyRunItem, HourlyWeatherData } from '@/ai/flows/generate-dashboard-content'; // Import from new flow

const daysOfWeekEnum = z.enum(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
const newsSearchCategoryValuesForSchema = [ // Zod enums need explicit array
  "geographic_area", "track_road_trail", "running_tech",
  "running_apparel", "marathon_majors", "nutrition", "training"
] as const;


export const UserProfileSchema = z.object({
  fitnessLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Beginner'),
  runningExperience: z.string().min(1, "Running experience is required.").default("Not set"),
  goal: z.enum(["5K", "10K", "Half Marathon", "Marathon", "50K/Ultramarathon"]).default("5K"),
  daysPerWeek: z.number().min(1).max(7).default(3),
  preferredWorkoutTypes: z.string().optional().default(""),
  availableTime: z.string().optional().default(""),
  equipmentAvailable: z.string().optional().default(""),
  newsSearchCategories: z.array(z.enum(newsSearchCategoryValuesForSchema)).optional().default([]), // Use the defined const array
  locationCity: z.string().optional().default(""),
  weatherUnit: z.enum(['C', 'F']).default('C'),
  preferredLongRunDay: daysOfWeekEnum.default('Sunday'),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  profile: UserProfileSchema.default({
    fitnessLevel: 'Beginner',
    runningExperience: 'Not set',
    goal: '5K',
    daysPerWeek: 3,
    preferredWorkoutTypes: '',
    availableTime: '',
    equipmentAvailable: '',
    newsSearchCategories: [],
    locationCity: '',
    weatherUnit: 'C',
    preferredLongRunDay: 'Sunday',
  }),
  trainingPlanId: z.string().nullable().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const WorkoutSchema = z.object({
  date: z.string(),
  description: z.string(),
  type: z.string(),
  completed: z.boolean().default(false),
});
export type Workout = z.infer<typeof WorkoutSchema>;

export const TrainingPlanSchema = z.object({
  id: z.string(),
  userId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  rawPlanText: z.string(),
  fitnessLevel: UserProfileSchema.shape.fitnessLevel,
  runningExperience: UserProfileSchema.shape.runningExperience,
  goal: UserProfileSchema.shape.goal,
  daysPerWeek: UserProfileSchema.shape.daysPerWeek,
  preferredLongRunDay: UserProfileSchema.shape.preferredLongRunDay.optional(),
});
export type TrainingPlan = z.infer<typeof TrainingPlanSchema>;


// Updated DashboardCacheSchema to align with GenerateDashboardOutputSchema
const DressMyRunItemForCacheSchema = z.object({
  item: z.string(),
  category: z.string(),
});

const NewsStoryForCacheSchema = z.object({
  title: z.string(),
  summary: z.string(),
  url: z.string().url(),
  source: z.string().optional(),
});

export const DashboardCacheSchema = z.object({
  id: z.string(), // userId
  userId: z.string(),
  cacheDate: z.string(), // ISO date string YYYY-MM-DD

  // Fields from GenerateDashboardOutputSchema
  greeting: z.string(),
  weatherSummary: z.string(),
  workoutForDisplay: z.string(),
  topStories: z.array(NewsStoryForCacheSchema),
  planEndNotification: z.string().nullable().optional(), // Ensure it can be null
  dressMyRunSuggestion: z.array(DressMyRunItemForCacheSchema),

  // Store the inputs to the flow as well, for invalidation checks
  // These help determine if the cache is stale due to profile changes.
  cachedInputs: z.object({
      locationCity: z.string().optional(),
      weatherUnit: z.enum(['C','F']).optional(),
      newsSearchCategories: z.array(z.enum(newsSearchCategoryValuesForSchema)).optional(),
      trainingPlanId: z.string().nullable().optional(), // Added trainingPlanId
      // Add other relevant profile fields that influence dashboard content if needed
  }).optional(),
});
export type DashboardCache = z.infer<typeof DashboardCacheSchema>;
