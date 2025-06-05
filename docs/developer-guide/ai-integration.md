
# AI Integration with Genkit and Gemini

The core AI capabilities of Shut Up and Run are powered by Google's Gemini models, orchestrated using the Genkit framework. This page details how these components are integrated.

## Genkit Overview

[Genkit](https://firebase.google.com/docs/genkit) is an open-source framework from Firebase designed to simplify building, deploying, and managing AI-powered features in applications. It provides abstractions for common AI tasks, making it easier to work with different models and tools.

Key Genkit concepts used in this application:

*   **Flows (`ai.defineFlow`)**: These are the primary units of AI logic. A flow is essentially a function that can take input, perform AI operations (like calling an LLM or a tool), and return output. Flows are designed to be callable from your application code.
*   **Prompts (`ai.definePrompt`)**: A prompt object encapsulates the instructions given to an LLM. It includes the prompt text (often using Handlebars templating for dynamic input), input/output schemas (defined with Zod), and configuration like which tools the LLM can use or safety settings.
*   **Tools (`ai.defineTool`)**: Tools give LLMs the ability to interact with external systems or perform specific actions. The LLM decides if and when to use a tool based on the prompt. Each tool has a defined input/output schema and a handler function.
*   **Schemas (Zod)**: [Zod](https://zod.dev/) is used extensively to define the structure of inputs and outputs for flows, prompts, and tools. This provides type safety and helps the LLM understand the expected data format, especially for structured output.
*   **Global `ai` Object**: A central `ai` object (initialized in `src/ai/genkit.ts`) is used to define and register flows, prompts, and tools with Genkit.

## Gemini Models

Shut Up and Run utilizes [Google's Gemini models](https://deepmind.google.com/technologies/gemini/) for its generative AI tasks. The specific Gemini model (e.g., `gemini-2.0-flash`) is configured in `src/ai/genkit.ts`. Gemini is capable of understanding and generating text, and some models can also handle multimodal input (like images, though image generation itself might use specific model variants).

## Core AI Flows

The AI logic is organized into several Genkit flows located in `src/ai/flows/`:

1.  **`generateDashboardContent.ts`**:
    *   **Purpose**: Generates all the dynamic content for the user's daily dashboard.
    *   **Inputs**: User details (ID, name, location, running level, goal), today's workout, detailed weather data (or error), weather unit, and news search categories.
    *   **Outputs**: A structured JSON object containing a motivational greeting, weather summary, running recommendation, "dress your run" clothing suggestion, and top news stories.
    *   **Process**:
        *   Uses `generateMotivationalPunTool` for the greeting.
        *   Analyzes `detailedWeather` input to summarize weather and recommend a run time.
        *   Uses `fetchGoogleRunningNewsTool` to get news articles based on user preferences and location.
        *   Constructs clothing recommendations based on the weather at the best run time.
        *   Checks if the training plan has ended to provide a notification.
    *   **Key Prompt Instructions**: The prompt guides the LLM to use the provided tools and structure its output according to the `GenerateDashboardOutputSchema`. It explicitly tells the LLM how to handle weather data errors and news tool errors.

2.  **`generateTrainingPlan.ts`**:
    *   **Purpose**: Creates a personalized multi-week training plan.
    *   **Inputs**: User's fitness level, running experience, goal race distance, desired training days per week, preferred long run day, plan start date, target race date (optional), and any additional notes.
    *   **Outputs**: A detailed training plan as a string, with each day's workout formatted (e.g., "YYYY-MM-DD: Workout description").
    *   **Process**: The LLM acts as a running coach, designing a progressive plan based on the inputs. The prompt specifies the desired output format, including weekly organization and details for each workout (type, distance/duration, pace).

3.  **`generateDailyWorkout.ts`**:
    *   **Purpose**: Determines the specific workout for the current day based on an existing training plan.
    *   **Inputs**: User profile summary, the raw text of their training schedule, and the current date.
    *   **Outputs**: A string describing the workout plan for that specific day.
    *   **Process**: The LLM parses the provided training schedule to find the entry for the given date.

4.  **`suggestWorkoutWhenNoPlan.ts`**:
    *   **Purpose**: Suggests a single workout if the user has no active training plan (or their plan has ended).
    *   **Inputs**: User's fitness level, workout preferences, available time, and available equipment.
    *   **Outputs**: A string describing a suggested workout.
    *   **Process**: The LLM acts as a personal trainer, recommending a suitable ad-hoc workout.

5.  **`generateMotivationalPun.ts`**: (Note: This flow is now largely encapsulated by `generateMotivationalPunTool` but might still be callable directly).
    *   **Purpose**: Generates a motivational greeting with a running-related pun.
    *   **Inputs**: User's name.
    *   **Outputs**: A greeting string.
    *   **Process**: Uses the LLM to generate a pun and then formats it into a greeting.

## AI Tools

Reusable tools are defined in `src/ai/tools/`:

1.  **`fetchGoogleRunningNewsTool.ts`**:
    *   **Purpose**: Fetches recent running-related news articles using the Google Custom Search API.
    *   **Inputs**: User's location (optional) and preferred news search categories (optional).
    *   **Outputs**: An array of news articles (title, link, snippet, source) or an error message.
    *   **Logic**:
        *   Constructs a search query based on inputs. If "geographic\_area" is a category and location is provided, the search is localized. Other categories become keywords. Defaults to general running news if no categories.
        *   Calls the Google Custom Search API, restricting results to the last 30 days (`dateRestrict=d30`).
        *   Formats the API response into the defined output schema.
        *   Handles API key errors and other fetch errors.

2.  **`generateMotivationalPunTool.ts`**:
    *   **Purpose**: Generates a friendly, motivational greeting with a running-related pun.
    *   **Inputs**: User's name.
    *   **Outputs**: A structured greeting string.
    *   **Logic**:
        *   Calls the LLM (`ai.generate`) to create a short, witty, running-related pun.
        *   Selects a random template from a predefined list and incorporates the user's name and the generated pun.

## Invoking AI Features

Genkit flows are standard asynchronous TypeScript functions. They are typically invoked from:

*   **Next.js Server Actions**: For form submissions or mutations (e.g., generating a training plan after user submits the setup form).
*   **Next.js API Routes**: If a more traditional API endpoint is needed.
*   **React Server Components (RSC)**: For fetching data during server rendering.
*   **Client Components (`useEffect`, event handlers)**: Client components can call server actions or API routes that, in turn, execute Genkit flows. In this app, the dashboard page (`src/app/dashboard/page.tsx`) directly calls the imported flow functions (which are marked with `'use server'`).

## Safety Settings

Gemini models have built-in safety filters. These can be configured within `ai.definePrompt` using the `config.safetySettings` option to adjust the blocking thresholds for various harm categories (e.g., hate speech, dangerous content). This is demonstrated in the `generateMotivationalPun.ts` flow.

## Error Handling & Retries

*   The `suggestWorkoutWhenNoPlanFlow` demonstrates a simple retry mechanism for API calls that might fail due to transient issues (like 503 errors).
*   The `generateDashboardContentFlow` includes a `try...catch` block around the main prompt call. If the primary generation fails, it attempts to construct a fallback dashboard content by calling individual tools/sub-flows where possible (e.g., getting a greeting even if the full dashboard fails). This enhances resilience.

This AI setup provides a powerful and flexible way to integrate sophisticated AI features into the Shut Up and Run application.
