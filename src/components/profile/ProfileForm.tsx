
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
import { Checkbox } from '@/components/ui/checkbox'; // Added Checkbox import
import { useUser, useFirestore, useDoc, setDocumentNonBlocking } from '@/firebase'; // Changed import
import { doc, type DocumentReference } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { UserProfileSchema, type User as AppUser, type UserProfile } from '@/lib/firebase-schemas';
import { useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


// Combine User fields (firstName, lastName, email) and UserProfile fields for the form
const ProfileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  email: z.string().email().or(z.literal('')), // Email can be a valid email or empty string for display
  profile: UserProfileSchema,
});

type ProfileFormValues = z.infer<typeof ProfileFormSchema>;

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

const newsSearchCategoryValuesForSchema = [ // Zod enums need explicit array
  "geographic_area", "track_road_trail", "running_tech",
  "running_apparel", "marathon_majors", "nutrition", "training"
] as const;


export function ProfileForm() {
  const { user: authUser, isUserLoading: isAuthUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userDocRef = useMemo(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid) as DocumentReference<AppUser>;
  }, [firestore, authUser]);

  const { data: userData, isLoading: isUserDataLoading, error: userDataError } = useDoc<AppUser>(userDocRef);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '', // Will be populated by useEffect
      profile: UserProfileSchema.parse({}), 
    },
  });

  useEffect(() => {
    if (userData) {
      let profileToSet;
      try {
        // Ensure all parts of profile are at least empty arrays/strings if missing, before parsing
        const profileDataForParsing = {
          ...UserProfileSchema.parse({}), // Start with defaults
          ...(userData.profile || {}), // Overlay existing data
          newsSearchCategories: userData.profile?.newsSearchCategories || [], // Explicitly default array
        };
        profileToSet = UserProfileSchema.parse(profileDataForParsing);
      } catch (e) {
        console.warn("Failed to parse existing user profile, falling back to schema defaults:", e);
        profileToSet = UserProfileSchema.parse({});
      }
      form.reset({
        firstName: userData.firstName || '', 
        lastName: userData.lastName || '',
        email: userData.email || '', 
        profile: profileToSet,
      });
    } else if (authUser && !isUserDataLoading && !userDataError) {
      // New user or user with no Firestore doc yet
      const defaultProfile = UserProfileSchema.parse({});
      form.reset({
        firstName: authUser.displayName?.split(' ')[0] || '',
        lastName: authUser.displayName?.split(' ').slice(1).join(' ') || '',
        email: authUser.email || '', 
        profile: defaultProfile,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData, authUser, form.reset, isUserDataLoading, userDataError]);


  const onSubmit = async (data: ProfileFormValues) => {
    if (!userDocRef || !authUser) { 
      toast({ variant: 'destructive', title: 'Error', description: 'User not found or not authenticated.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const userDataToSave: Partial<AppUser> = {
        firstName: data.firstName,
        lastName: data.lastName,
        profile: data.profile,
      };

      if (authUser.email) { 
        userDataToSave.email = authUser.email;
      }

      setDocumentNonBlocking(userDocRef, userDataToSave, { merge: true });
      
      toast({ title: 'Profile Updated', description: 'Your profile has been successfully updated.' });
    } catch (error) {
      console.error('Profile update failed:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update profile. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isAuthUserLoading || (authUser && isUserDataLoading)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (userDataError) {
     return <p className="text-destructive">Error loading profile data: {userDataError.message}</p>;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>Your Profile</CardTitle>
        <CardDescription>Manage your personal information and training preferences.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your first name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Your email" {...field} disabled />
                  </FormControl>
                  <FormDescription>Email cannot be changed here. For anonymous users, this will be blank.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <h3 className="text-lg font-medium pt-4 border-t">Training Preferences</h3>

            <FormField
              control={form.control}
              name="profile.fitnessLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Running Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your running level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="profile.runningExperience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Running Experience</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe your running experience (e.g., new to running, run a few times a week, marathon runner)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="profile.goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Goal</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your primary goal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="5K">5K</SelectItem>
                      <SelectItem value="10K">10K</SelectItem>
                      <SelectItem value="Half Marathon">Half Marathon</SelectItem>
                      <SelectItem value="Marathon">Marathon</SelectItem>
                      <SelectItem value="50K/Ultramarathon">50K/Ultramarathon</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="profile.daysPerWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Training Days Per Week</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select days" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7].map(day => (
                          <SelectItem key={day} value={String(day)}>{day} day{day > 1 ? 's' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="profile.preferredLongRunDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Long Run Day</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select preferred day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {daysOfWeek.map(day => (
                          <SelectItem key={day} value={day}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>


            <h3 className="text-lg font-medium pt-4 border-t">Weather & Location Preferences</h3>
             <FormField
              control={form.control}
              name="profile.locationCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (City)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., New York" {...field} />
                  </FormControl>
                  <FormDescription>Used for local weather forecasts on your dashboard.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="profile.weatherUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weather Unit</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select temperature unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="C">Celsius (°C)</SelectItem>
                      <SelectItem value="F">Fahrenheit (°F)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Preferred unit for temperature display.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <h3 className="text-lg font-medium pt-4 border-t">Workout Suggestions Preferences</h3>
            <FormDescription>These settings help us suggest workouts if you don&apos;t have an active plan.</FormDescription>
             <FormField
              control={form.control}
              name="profile.preferredWorkoutTypes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Workout Types</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Running, HIIT, Yoga" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormDescription>Comma-separated list of your preferred workout types.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="profile.availableTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Typical Available Time for Workout</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 30 minutes, 1 hour" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="profile.equipmentAvailable"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipment Available</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Dumbbells, Treadmill, None" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <h3 className="text-lg font-medium pt-4 border-t">News Preferences</h3>
            
            <FormField
              control={form.control}
              name="profile.newsSearchCategories"
              render={({ field }) => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">News Categories</FormLabel>
                    <FormDescription>
                      Select the types of running news you&apos;d like to see.
                    </FormDescription>
                  </div>
                  {newsSearchCategoryValuesForSchema.map((categoryValue) => (
                    <FormItem key={categoryValue} className="flex flex-row items-start space-x-3 space-y-0 mb-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(categoryValue)}
                          onCheckedChange={(checked) => {
                            const currentValue = field.value || [];
                            return checked
                              ? field.onChange([...currentValue, categoryValue])
                              : field.onChange(
                                currentValue.filter(
                                    (value) => value !== categoryValue
                                  )
                                );
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        {categoryValue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </FormLabel>
                    </FormItem>
                  ))}
                  <FormMessage />
                </FormItem>
              )}
            />


            <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

