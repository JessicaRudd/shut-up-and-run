
# Developer Guide

This section of the documentation is for developers looking to understand the technical aspects of the Shut Up and Run application, set up a local development environment, or contribute to the project.

## Overview

Shut Up and Run is built using Next.js, React, ShadCN UI, Tailwind CSS, Firebase (for backend services like Auth and Firestore), and Genkit with Google Gemini for its AI-powered features.

## Key Developer Topics

*   **[Setup Instructions](setup.md)**: Learn how to clone the repository, install dependencies, and configure your local environment to run the application. This includes setting up Firebase emulators and necessary API keys for development.
*   **[Application Architecture](../architecture.md)**: A detailed look at the overall structure of the application, how components interact, and the flow of data.
*   **[AI Integration](ai-integration.md)**: Understand how Genkit is used to define flows and tools, and how these interact with the Gemini LLM to generate personalized content, training plans, and other intelligent features.
*   **[Firebase Backend](firebase-backend.md)**: Details on the Firestore database schema, collection structure, Firebase Authentication setup, and security rules.
*   **[API Keys & Secrets](api-keys.md)**: Comprehensive guide on obtaining, configuring, and securely managing API keys for external services like OpenWeatherMap and Google Custom Search, particularly focusing on Google Cloud Secret Manager for production.
*   **[Styling & UI Components](../#)**: (TODO: Link to a future page about ShadCN UI and Tailwind CSS conventions if needed)
*   **[Deployment](../deployment.md)**: Information on deploying the application to Firebase App Hosting.

Before diving in, ensure you have a good understanding of the technologies mentioned above.
