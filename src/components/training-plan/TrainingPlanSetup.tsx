
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { User as AppUser, TrainingPlan as AppTrainingPlan } from '@/lib/firebase-schemas';
import { UserProfileSchema } from '@/lib/firebase-schemas'; // UserProfileSchema.shape.goal is now an enum
import { useState, useEffect } from 'react';
import { generateTrainingPlan } from '@/ai/flows';
import { format, addDays, differenceInCalendarDays, isValid } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const TrainingPlanSetupSchema = z.object({
  fitnessLevel: UserProfileSchema.shape.fitnessLevel,
  runningExperience: UserProfileSchema.shape.runningExperience,
  goal: UserProfileSchema.shape.goal, // This is now an enum from UserProfileSchema
  daysPerWeek: UserProfileSchema.shape.daysPerWeek,
  startDate: z.date({ required_error: "Start date is required." }),
  targetRaceDate: z.date().optional(),
  durationWeeks: z.number().min(1, "Duration must be at least 1 week.").max(52, "Duration cannot exceed 52 weeks."),
  additionalNotes: z.string().optional(),
}).refine(data => {
  if (data.targetRaceDate && data.startDate && data.targetRaceDate < data.startDate) {
    return false;
  }
  return true;
}, {
  message: "Target race date cannot be before the start date.",
  path: ["targetRaceDate"],
});

type TrainingPlanSetupValues = z.infer<typeof TrainingPlanSetupSchema>;

interface TrainingPlanSetupProps {
  currentUserData: AppUser;
  onPlanGenerated: (planId: string) => void;
}

export function TrainingPlanSetup({ currentUserData, onPlanGenerated }: TrainingPlanSetupProps) {
  const auth = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TrainingPlanSetupValues>({
    resolver: zodResolver(TrainingPlanSetupSchema),
    defaultValues: {
      fitnessLevel: currentUserData.profile.fitnessLevel,
      runningExperience: currentUserData.profile.runningExperience,
      goal: currentUserData.profile.goal,
      daysPerWeek: currentUserData.profile.daysPerWeek,
      startDate: new Date(),
      targetRaceDate: undefined,
      durationWeeks: 12, 
      additionalNotes: '',
    },
  });

  const { watch, setValue, getValues } = form;
  const watchedStartDate = watch("startDate");
  const watchedTargetRaceDate = watch("targetRaceDate");
  const watchedDurationWeeks = watch("durationWeeks");

  useEffect(() => {
    if (watchedStartDate && watchedTargetRaceDate && isValid(watchedStartDate) && isValid(watchedTargetRaceDate)) {
      if (watchedTargetRaceDate >= watchedStartDate) {
        const diffDays = differenceInCalendarDays(watchedTargetRaceDate, watchedStartDate) + 1; // Inclusive
        const weeks = Math.max(1, Math.ceil(diffDays / 7));
        if (weeks !== watchedDurationWeeks) {
           setValue("durationWeeks", weeks, { shouldValidate: true });
        }
      }
    }
  }, [watchedStartDate, watchedTargetRaceDate, setValue, watchedDurationWeeks]);

  useEffect(() => {
    form.reset({
      fitnessLevel: currentUserData.profile.fitnessLevel,
      runningExperience: currentUserData.profile.runningExperience,
      goal: currentUserData.profile.goal,
      daysPerWeek: currentUserData.profile.daysPerWeek,
      startDate: getValues("startDate") || new Date(),
      targetRaceDate: getValues("targetRaceDate"),
      durationWeeks: getValues("durationWeeks") || 12,
      additionalNotes: getValues("additionalNotes") || '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserData, form.reset]); // form.getValues removed from deps as it causes loop, rely on currentUserData


  const onSubmit = async (data: TrainingPlanSetupValues) => {
    if (!auth.user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not authenticated.' });
      return;
    }
    setIsSubmitting(true);

    let calculatedEndDate: Date;
    if (data.targetRaceDate && isValid(data.targetRaceDate)) {
      calculatedEndDate = data.targetRaceDate;
    } else {
      calculatedEndDate = addDays(data.startDate, data.durationWeeks * 7 - 1);
    }

    try {
      const planInput = {
        fitnessLevel: data.fitnessLevel,
        runningExperience: data.runningExperience,
        goal: data.goal,
        daysPerWeek: data.daysPerWeek,
        startDate: format(data.startDate, 'yyyy-MM-dd'),
        endDate: format(calculatedEndDate, 'yyyy-MM-dd'),
        targetRaceDate: data.targetRaceDate ? format(data.targetRaceDate, 'yyyy-MM-dd') : undefined,
        additionalNotes: data.additionalNotes || '',
      };

      const aiResult = await generateTrainingPlan(planInput);

      const trainingPlansColRef = collection(firestore, 'trainingPlans');
      const newPlanRef = doc(trainingPlansColRef); 

      const newPlanData: AppTrainingPlan = {
        id: newPlanRef.id,
        userId: auth.user.uid,
        startDate: planInput.startDate,
        endDate: planInput.endDate,
        rawPlanText: aiResult.trainingPlan,
        fitnessLevel: data.fitnessLevel,
        runningExperience: data.runningExperience,
        goal: data.goal,
        daysPerWeek: data.daysPerWeek,
      };
      
      setDocumentNonBlocking(newPlanRef, newPlanData, {});

      const userDocRef = doc(firestore, 'users', auth.user.uid);
      updateDocumentNonBlocking(userDocRef, { trainingPlanId: newPlanRef.id });
      
      onPlanGenerated(newPlanRef.id);
      toast({ title: 'Training Plan Generated!', description: 'Your new plan is ready.' });

    } catch (error) {
      console.error('Training plan generation failed:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: (error as Error).message || 'Could not generate training plan. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle>Create Your Training Plan</CardTitle>
        <CardDescription>
          Fill in your details below. Our AI will generate a personalized training plan for you.
          Some fields are pre-filled from your profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="fitnessLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Running Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select running level" /></SelectTrigger>
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
                name="daysPerWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Training Days Per Week</FormLabel>
                    <Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select days" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1,2,3,4,5,6,7].map(d => <SelectItem key={d} value={String(d)}>{d} day{d > 1 ? 's':''}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="runningExperience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Running Experience</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., New to running, run a few times a month" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Goal (Race Distance)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select your target race" /></SelectTrigger>
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
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value && isValid(field.value) ? format(field.value, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < addDays(new Date(), -1) }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetRaceDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Target Race Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value && isValid(field.value) ? format(field.value, "PPP") : <span>Pick a race date</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                          }}
                           disabled={(date) => 
                            (watchedStartDate && isValid(watchedStartDate) && date < watchedStartDate) || 
                            date < new Date(new Date().setHours(0,0,0,0)) // Disable past dates from today
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>If set, plan duration will be calculated.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="durationWeeks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Duration (weeks)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="e.g., 12" 
                      {...field} 
                      onChange={e => field.onChange(parseInt(e.target.value,10) || 0)}
                      disabled={!!watchedTargetRaceDate} 
                      readOnly={!!watchedTargetRaceDate}
                    />
                  </FormControl>
                  <FormDescription>
                    {watchedTargetRaceDate ? "Calculated based on start and target race date." : "Or select a target race date above."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="additionalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any specific preferences, injuries, or constraints?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Training Plan
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

