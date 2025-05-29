import { z } from 'zod';

export const UserProfileSchema = z.object({
  fitnessLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Beginner'),
  runningExperience: z.string().min(1, "Running experience is required.").default(""),
  goal: z.string().min(1, "Goal is required.").default(""),
  daysPerWeek: z.number().min(1).max(7).default(3),
  preferredWorkoutTypes: z.string().optional().default(""), // e.g., "running, yoga"
  availableTime: z.string().optional().default(""), // e.g., "30 minutes"
  equipmentAvailable: z.string().optional().default(""), // e.g., "None"
  newsSources: z.array(z.string()).optional().default([]), // e.g., ["Runner's World"]
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const UserSchema = z.object({
  id: z.string(), // Firebase UID
  email: z.string().email(),
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  profile: UserProfileSchema.default({
    fitnessLevel: 'Beginner',
    runningExperience: '',
    goal: '',
    daysPerWeek: 3,
    preferredWorkoutTypes: '',
    availableTime: '',
    equipmentAvailable: '',
    newsSources: [],
  }),
  trainingPlanId: z.string().nullable().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const WorkoutSchema = z.object({
  date: z.string(), // ISO date string
  description: z.string(),
  type: z.string(),
  completed: z.boolean().default(false),
});
export type Workout = z.infer<typeof WorkoutSchema>;

export const TrainingPlanSchema = z.object({
  id: z.string(),
  userId: z.string(),
  startDate: z.string(), // ISO date string
  endDate: z.string(), // ISO date string
  rawPlanText: z.string(),
  // workouts: z.array(WorkoutSchema).optional(), // Store rawPlanText for MVP
  fitnessLevel: UserProfileSchema.shape.fitnessLevel,
  runningExperience: UserProfileSchema.shape.runningExperience,
  goal: UserProfileSchema.shape.goal,
  daysPerWeek: UserProfileSchema.shape.daysPerWeek,
});
export type TrainingPlan = z.infer<typeof TrainingPlanSchema>;

export const DashboardCacheSchema = z.object({
  id: z.string(), // userId
  userId: z.string(),
  cacheDate: z.string(), // ISO date string YYYY-MM-DD
  motivationalGreeting: z.string(),
  weatherInfo: z.object({
    forecast: z.string(),
    clothingRecommendation: z.string(),
  }),
  dailyWorkout: z.string(),
  runningNews: z.array(z.string()),
});
export type DashboardCache = z.infer<typeof DashboardCacheSchema>;
