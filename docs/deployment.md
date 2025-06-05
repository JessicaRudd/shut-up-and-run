
# Deployment Guide

This guide covers deploying the Shut Up and Run application and its documentation.

## Deploying the Application (Firebase App Hosting)

Shut Up and Run is designed to be deployed using [Firebase App Hosting](https://firebase.google.com/docs/app-hosting).

### Prerequisites

*   A configured Firebase project.
*   Firebase CLI installed and logged in (`firebase login`).
*   Your local project associated with your Firebase project (`firebase use <your-project-id>`).
*   API keys and secrets configured in Google Cloud Secret Manager and referenced in `apphosting.yaml` (see [API Keys Guide](developer-guide/api-keys.md)).
*   Firestore security rules (`firestore.rules`) in place.

### Deployment Steps

1.  **Build Your Next.js Application**:
    Ensure your application builds correctly:
    ```bash
    npm run build
    ```
    This command compiles your Next.js application into an optimized production build in the `.next` directory.

2.  **Deploy using Firebase CLI**:
    From the root of your project, run:
    ```bash
    firebase apphosting:backends:deploy YOUR_BACKEND_ID --project YOUR_PROJECT_ID
    ```
    *   Replace `YOUR_BACKEND_ID` with the ID of your App Hosting backend (you create this in the Firebase console under App Hosting).
    *   Replace `YOUR_PROJECT_ID` with your Firebase project ID.

    Alternatively, if you have a `firebase.json` configured for App Hosting (though `apphosting.yaml` is primary for backend config), you might use a more general deploy command after setting up your backend in the Firebase console:
    ```bash
    firebase deploy --only apphosting
    ```

    The Firebase CLI will build your Next.js app (if not already built or if App Hosting's build process takes over), package it, and deploy it to the App Hosting infrastructure. It will use the settings defined in your `apphosting.yaml` file to configure the runtime environment, including environment variables sourced from Secret Manager.

3.  **Accessing Your Deployed App**:
    Once deployment is complete, the Firebase CLI will output the URL where your application is live. You can also find this URL in the Firebase console under App Hosting.

### Continuous Integration/Continuous Deployment (CI/CD)

For automated deployments, you can integrate the Firebase CLI deployment commands into a CI/CD pipeline (e.g., using GitHub Actions, Cloud Build). This typically involves:
*   Setting up service account credentials for the Firebase CLI in your CI/CD environment.
*   Running build steps.
*   Executing the `firebase apphosting:backends:deploy` command.

## Deploying Documentation (GitHub Pages)

This documentation is written in Markdown and can be easily deployed using [GitHub Pages](https://pages.github.com/).

### Prerequisites

*   Your project hosted on GitHub.
*   The documentation files (Markdown, `_config.yml`) located in the `/docs` directory of your repository.

### Setup Steps

1.  **Ensure `_config.yml` is Present**:
    A basic `_config.yml` file is provided in the `/docs` directory. This file tells Jekyll (GitHub Pages' default static site generator) how to build your site. You can customize it further.
    ```yaml
    # docs/_config.yml
    theme: jekyll-theme-minimal # Or any other Jekyll theme
    title: Shut Up and Run Documentation
    description: Official documentation for the Shut Up and Run application.
    ```

2.  **Configure GitHub Pages**:
    *   Go to your repository on GitHub.
    *   Click on **Settings**.
    *   In the left sidebar, click on **Pages**.
    *   Under "Build and deployment":
        *   **Source**: Select "Deploy from a branch".
        *   **Branch**: Choose the branch where your documentation exists (e.g., `main` or `gh-pages`).
        *   **Folder**: Select `/docs`.
    *   Click **Save**.

3.  **Accessing Your Documentation Site**:
    GitHub Pages will build your site from the `/docs` folder using Jekyll. After a few minutes, your documentation site will be available at a URL like `https://<your-username>.github.io/<your-repository-name>/`. You can find the exact URL in the GitHub Pages settings.

### Custom Domain (Optional)

You can configure a custom domain for your GitHub Pages site in the GitHub Pages settings.

### Using Other Static Site Generators

While Jekyll is the default, you can use other static site generators (like MkDocs, Docusaurus, VitePress) with GitHub Pages. This typically involves:
1.  Setting up the chosen generator in your project.
2.  Building your documentation into a static HTML/CSS/JS site (often into a `/dist` or `/build` folder within `/docs`, or directly into the root for a `gh-pages` branch).
3.  Configuring a GitHub Actions workflow to build the site and deploy the static files to the `gh-pages` branch, or configuring GitHub Pages to serve from a specific folder containing the pre-built static assets.

For simplicity, this guide focuses on the default Jekyll setup with GitHub Pages.
