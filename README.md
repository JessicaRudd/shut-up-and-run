
# Shut Up and Run

Shut Up and Run is a smart running companion app designed to help runners of all levels stay motivated, informed, and on track with their training. It leverages the power of AI and cloud services to provide personalized features like dynamic training plans, daily workout suggestions, motivational messages, and real-time information like weather updates and running news.

## Documentation

**For comprehensive documentation, including user guides, developer guides, architecture details, and deployment instructions, please visit our [official documentation site](docs/index.md) (or the deployed GitHub Pages link once available).**

## Overview (from Old README - see full docs for more detail)

Shut Up and Run combines a Next.js frontend with Firebase backend services and Genkit/Gemini for AI-driven personalization.

### Key Components:

1.  **The App (Frontend - Next.js)**: User interface for interaction.
2.  **The Brains (AI - Gemini & Genkit)**: Generates personalized content, plans, and insights.
3.  **The Backbone (Backend - Firebase)**: Handles authentication (Firebase Auth), data storage (Firestore), and hosts the application (App Hosting).
4.  **External Services**: Integrates with weather APIs (OpenWeatherMap) and news APIs (Google Custom Search) for real-time information.

### Simplified Flow:

1.  User opens the Next.js app.
2.  App communicates with Firebase for auth and data.
3.  For AI features (e.g., dashboard content, training plans), the app invokes Genkit flows.
4.  Genkit flows use Gemini (and tools that call external APIs like weather/news) to generate content.
5.  Content is returned to the app and displayed.

## Getting Started (For Developers - Quick Start)

For detailed setup, see the **[Developer Setup Guide in the documentation](docs/developer-guide/setup.md)**.

*   **Frontend Code**: `/src`
*   **AI Flows**: `/src/ai`
*   **Firebase Configuration**: `firebase.json`, `apphosting.yaml`, `firestore.rules`, and client setup in `/src/firebase`.

To run locally:
1.  Clone the repository.
2.  Install dependencies: `npm install`
3.  Set up your `.env.local` file with API keys (see `docs/developer-guide/api-keys.md`).
4.  Run Genkit: `npm run genkit:watch` (in one terminal)
5.  Run Next.js app: `npm run dev` (in another terminal)

## Deployment

The application is deployed using Firebase App Hosting. Documentation can be deployed using GitHub Pages. See the **[Deployment Guide](docs/deployment.md)** for more details.
