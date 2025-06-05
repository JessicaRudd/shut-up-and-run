
# Development Setup Guide

This guide will walk you through setting up the Shut Up and Run application for local development.

## Prerequisites

*   **Node.js**: Ensure you have Node.js (version 18.x or later recommended) and npm/yarn installed.
*   **Firebase CLI**: Install the Firebase CLI: `npm install -g firebase-tools`.
*   **Git**: For cloning the repository.
*   **A Firebase Project**: You'll need an active Firebase project. If you don't have one, create it at the [Firebase Console](https://console.firebase.google.com/).
*   **Google Cloud Project**: Your Firebase project is also a Google Cloud project. You'll need access to this for managing API keys and Secret Manager.

## 1. Clone the Repository

```bash
git clone <repository-url>
cd <repository-directory>
```

## 2. Install Dependencies

Install the project dependencies using npm (or yarn):

```bash
npm install
# or
# yarn install
```

## 3. Firebase Setup

### Login to Firebase CLI

```bash
firebase login
```

### Initialize Firebase in Your Project (if not already done)

Associate your local project with your Firebase project:

```bash
firebase use --add
```
Select your Firebase project from the list. This will create a `.firebaserc` file.

### Configure Firebase Emulators

The project is configured to use Firebase Emulators for Authentication and Firestore during local development.

1.  **Emulator Suite**: The configuration in `firebase.json` defines ports for the Auth and Firestore emulators, as well as the Emulator UI.
2.  **Starting Emulators**: You typically don't need to start emulators separately if you use the combined dev script, but if you want to run them independently:
    ```bash
    firebase emulators:start
    ```
    You can then access the Emulator UI (usually at `http://localhost:4000`).

## 4. Environment Variables for Local Development

For local development, you need to set up API keys and emulator host variables.

1.  **Create `.env.local` file**: In the root of your project, create a file named `.env.local`.
2.  **Add Firebase Project ID**:
    ```env
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-firebase-project-id"
    ```
    Replace `"your-firebase-project-id"` with your actual Firebase Project ID.
3.  **Add API Keys**:
    Obtain API keys for the following services and add them to your `.env.local`:
    *   **Gemini API Key** (Google AI Studio or Google Cloud Console):
        ```env
        GEMINI_API_KEY="your_gemini_api_key"
        ```
    *   **OpenWeatherMap API Key**:
        ```env
        OPENWEATHERMAP_API_KEY="your_openweathermap_api_key"
        ```
    *   **Google Custom Search API Key & Engine ID**:
        ```env
        GOOGLE_CUSTOM_SEARCH_API_KEY="your_google_custom_search_api_key"
        GOOGLE_CUSTOM_SEARCH_ENGINE_ID="your_google_custom_search_engine_id"
        ```
    Refer to the **[API Keys Guide](api-keys.md)** for more details on obtaining these keys.
4.  **Emulator Host Variables (for Firebase Studio / IDX compatibility)**:
    The project's `src/firebase/index.ts` is set up to connect to emulators using specific environment variables that are typically provided by cloud development environments like Firebase Studio (IDX). For general local development, ensure your `firebase.json` has the correct ports (default for IDX are 9099 for auth, 8080 for firestore). The `initializeFirebase` function automatically uses these standard ports if `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` and `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` are not set to specific cloud IDE domains.
    If you're *not* using a cloud IDE that injects these, the app will try to connect to `localhost:9099` (auth) and `localhost:8080` (firestore) by default if it detects a non-production environment.

**Example `.env.local`**:
```env
NEXT_PUBLIC_FIREBASE_PROJECT_ID="my-cool-run-app"

GEMINI_API_KEY="AIzaSyXXXXXXXXXXXXXXXXXXX"
OPENWEATHERMAP_API_KEY="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
GOOGLE_CUSTOM_SEARCH_API_KEY="AIzaSyYYYYYYYYYYYYYYYYYY"
GOOGLE_CUSTOM_SEARCH_ENGINE_ID="zzzzzzzzzzzzzzzzzz"

# For IDX/Cloud Workstations, these are provided. For local dev, may not be needed
# if defaults in firebase.json are used (e.g. localhost:9099, localhost:8080).
# NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=your-auth-emulator-host-domain
# NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=your-firestore-emulator-host-domain
```
**Important**: Do NOT commit your `.env.local` file to Git. Ensure it's in your `.gitignore` file.

## 5. Running the Application Locally

The `package.json` file contains scripts to run the Next.js app and the Genkit development server:

*   **`npm run dev`**: Starts the Next.js development server (usually on `http://localhost:9002`). This uses Turbopack for faster builds.
*   **`npm run genkit:dev`**: Starts the Genkit development server. This allows you_to_see and test your Genkit flows and tools in the Genkit Developer UI (usually `http://localhost:4000/genkit`).
*   **`npm run genkit:watch`**: Starts the Genkit server with file watching, automatically restarting on changes.

It's often useful to run the Next.js app and the Genkit server in separate terminal windows.

1.  **Terminal 1 (Genkit)**:
    ```bash
    npm run genkit:watch
    ```
2.  **Terminal 2 (Next.js App)**:
    ```bash
    npm run dev
    ```

Now you should be able to access your application at `http://localhost:9002` and the Genkit UI at `http://localhost:4000/genkit` (this port might vary, check your `firebase.json` for the hub port, often 4400, Genkit default is 3400 but can be configured).

## 6. Populating Initial Data (Optional)

If your application requires initial data in Firestore (e.g., default settings, sample user data for testing), you might need to:

*   Use the Firebase Emulator UI to add data manually.
*   Create seeding scripts that can populate the emulated Firestore instance.

## Troubleshooting

*   **Port Conflicts**: If ports 9002, 4000, 8080, or 9099 are in use, you may need to adjust them in `package.json` (for the Next.js dev server port) or `firebase.json` (for emulator ports).
*   **API Key Errors**: Double-check your API keys in `.env.local` and ensure the services (Gemini, OpenWeatherMap, Google Search) are enabled for your project and the keys have the correct permissions.
*   **Firebase Emulator Issues**: Consult the [Firebase Emulator documentation](https://firebase.google.com/docs/emulator-suite/install_and_configure).

You are now ready to start developing Shut Up and Run locally!
