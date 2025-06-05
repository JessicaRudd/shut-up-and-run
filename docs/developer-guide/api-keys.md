
# API Keys and Secrets Management

Shut Up and Run integrates with several external services that require API keys for authentication and access. It's crucial to manage these keys securely.

## Required API Keys

1.  **Gemini API Key (Google AI)**
    *   **Service**: Used by Genkit to make calls to Google's Gemini models for all AI-powered features (dashboard content generation, training plans, etc.).
    *   **Obtaining**:
        *   You can get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
        *   Alternatively, if using Gemini via Vertex AI on Google Cloud, you would configure authentication appropriate for that environment (often service account based for server-to-server calls). For this project's setup with Genkit and the `@genkit-ai/googleai` plugin, a direct API key is common for development.
    *   **Environment Variable**: `GEMINI_API_KEY`

2.  **OpenWeatherMap API Key**
    *   **Service**: Used to fetch current and forecast weather data for the user's location.
    *   **Obtaining**: Sign up at [OpenWeatherMap](https://openweathermap.org/api) and subscribe to an API plan (the "One Call API 3.0" is used, which often has a free tier with limitations).
    *   **Environment Variable**: `OPENWEATHERMAP_API_KEY`

3.  **Google Custom Search API Key & Engine ID**
    *   **Service**: Used by the `fetchGoogleRunningNewsTool` to search for running-related news articles.
    *   **Obtaining**:
        *   **API Key**: Enable the "Custom Search API" in the Google Cloud Console for your Firebase project and create an API key.
        *   **Search Engine ID (CSE ID)**: Create a Programmable Search Engine at [Programmable Search Engine control panel](https://programmablesearchengine.google.com/). Configure it to search relevant sites or the entire web. The ID will be available in the CSE setup.
    *   **Environment Variables**:
        *   `GOOGLE_CUSTOM_SEARCH_API_KEY`
        *   `GOOGLE_CUSTOM_SEARCH_ENGINE_ID`

## Secure Management of API Keys

### Local Development (`.env.local`)

For local development, store your API keys in a `.env.local` file in the root of your project. This file should **NOT** be committed to version control.

**Example `.env.local`:**
```env
# Firebase Project ID (needed by client-side SDK if not auto-configured)
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-firebase-project-id"

# Server-side API Keys
GEMINI_API_KEY="your_gemini_api_key_here"
OPENWEATHERMAP_API_KEY="your_openweathermap_api_key_here"
GOOGLE_CUSTOM_SEARCH_API_KEY="your_google_search_api_key_here"
GOOGLE_CUSTOM_SEARCH_ENGINE_ID="your_search_engine_id_here"
```
Ensure `.env.local` is listed in your `.gitignore` file.

### Production Deployment (Firebase App Hosting & Secret Manager)

For production deployments on Firebase App Hosting, API keys and other secrets **must not** be hardcoded or included in your source code repository. They are managed using **Google Cloud Secret Manager**.

1.  **Store Secrets in Secret Manager**:
    *   Navigate to the [Google Cloud Console](https://console.cloud.google.com/) for your Firebase project.
    *   Go to **Security > Secret Manager**.
    *   Create new secrets for each API key. Use clear names, for example:
        *   `GEMINI_API_KEY`
        *   `OPENWEATHERMAP_API_KEY`
        *   `GOOGLE_CUSTOM_SEARCH_API_KEY`
        *   `GOOGLE_CUSTOM_SEARCH_ENGINE_ID`
    *   Add a "version" for each secret containing the actual API key value.

2.  **Grant Permissions to App Hosting**:
    *   Your Firebase App Hosting backend runs with a service account (identity). This service account needs permission to access the secrets you created.
    *   In Secret Manager, for each secret:
        *   Go to the "Permissions" tab.
        *   Click "Add Principal".
        *   Enter the email address of your App Hosting service account. This is typically in the format `PROJECT_NUMBER-compute@developer.gserviceaccount.com` or a more specific App Hosting service identity shown in your App Hosting backend details.
        *   Assign the role "**Secret Manager Secret Accessor**".
        *   Save the permissions.

3.  **Reference Secrets in `apphosting.yaml`**:
    Your `apphosting.yaml` file tells Firebase App Hosting which environment variables to set for your application and how to source their values from Secret Manager.

    ```yaml
    # apphosting.yaml
    env:
      - variable: GEMINI_API_KEY
        secret: projects/YOUR_PROJECT_ID/secrets/GEMINI_API_KEY/versions/latest
      - variable: OPENWEATHERMAP_API_KEY
        secret: projects/YOUR_PROJECT_ID/secrets/OPENWEATHERMAP_API_KEY/versions/latest
      - variable: GOOGLE_CUSTOM_SEARCH_API_KEY
        secret: projects/YOUR_PROJECT_ID/secrets/GOOGLE_CUSTOM_SEARCH_API_KEY/versions/latest
      - variable: GOOGLE_CUSTOM_SEARCH_ENGINE_ID
        secret: projects/YOUR_PROJECT_ID/secrets/GOOGLE_CUSTOM_SEARCH_ENGINE_ID/versions/latest
    # ... other configurations like runConfig ...
    ```
    *   Replace `YOUR_PROJECT_ID` with your actual Google Cloud Project ID.
    *   Ensure the secret names (`GEMINI_API_KEY`, etc.) in the path match the names you used when creating them in Secret Manager.
    *   Using `/versions/latest` ensures your app always gets the most recent active version of the secret.

    When your application runs in App Hosting, Firebase will fetch the secret values from Secret Manager and inject them as environment variables with the specified `variable` names (e.g., `process.env.GEMINI_API_KEY`).

## Accessing API Keys in Code

Your application code (e.g., in Genkit tools or server actions) accesses these API keys via `process.env`:

```typescript
// Example from src/ai/tools/fetch-google-running-news-tool.ts
const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

// Example from src/app/actions/weatherActions.ts
const apiKey = process.env.OPENWEATHERMAP_API_KEY;

// Genkit googleAI plugin often picks up GEMINI_API_KEY automatically if set.
```

This setup ensures that:
*   API keys are kept out of your codebase.
*   They are securely managed in a dedicated secrets management service.
*   Your application can access them in a standard way through environment variables, regardless of whether it's running locally or deployed.
