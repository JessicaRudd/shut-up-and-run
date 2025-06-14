# **App Name**: RunMate

## Core Features:

- User Authentication & Profile Management: User authentication and profile management, with pages for login, signup, and profile editing. Includes a profile form to manage user preferences and training plan details. Profile information persisted to Firestore.
- Personalized Dashboard: AI-powered dashboard providing a motivational greeting (with a tool that generates puns), local weather forecast with running recommendations, a dynamically-generated daily workout based on the user profile and training schedule, 'dress your run' clothing advice based on weather, and running news, all integrated within a central personalized user dashboard. Dashboard content is cached on the backend until the next day or settings are updated to ensure optimal UX.
- Training Plan Page: Training plan page offering both calendar and list views of the user's training schedule. Includes workout details and workout end notification. The full plan is generated by AI and saved in the user profile. When the plan reaches the end date, users receive messages about the plan completion. If the plan is over and no new plan is selected, the LLM will generate suggested workouts.
- Feedback Submission: Feedback page with a form for users to submit feedback (feedback is currently ephemeral)
- Backend Management: Backend to manage user profiles, store training plans, cache weather data, cache dashboard for the day until next day dash is generated or the user updates their news settings in profile, etc.

## Style Guidelines:

- Primary color: Saturated, warm orange (#FF7700) to evoke energy and motivation.
- Background color: Light warm gray (#F2F0EE), providing a soft, neutral backdrop.
- Accent color: A bright yellow (#FFD700), for focus and highlights
- Use the existing clean, readable sans-serif font (Geist Sans).
- lucide-react icon set is used. It will have clear and consistent icons for weather, clothing, and navigation.
- A clean and structured design featuring card-based sections. Employs ShadCN UI components.