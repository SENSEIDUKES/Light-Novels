# Contributing to SEIHOUSE

Welcome to the SEIHOUSE project! This guide is to help you get acquainted with our folder structure and feature addition pipeline.

## Folder Structure

Our codebase is organized to support a robust, scalable React application combined with a full-stack Node.js server.

- **`/` (Root)**: Contains configuration files (like `package.json`, `vite.config.ts`, `tsconfig.json`) and the main Node backend entry point (`server.ts`).
- **`/src/components/`**: React functional components for the UI. Subfolders like `/src/components/codex/` hold domain-specific features.
- **`/src/features/`**: Large modular chunks of the app (e.g., `/creation/` holds everything related to setting up a new story).
- **`/src/hooks/`**: Custom React hooks housing core business logic, API calls, and state derivations.
- **`/src/lib/`**: Standalone libraries, helpers, Firebase config, audio processing logic, and persistence logic.
- **`/src/server/`**: Supporting files for the Node backend, including AI prompt templates and parsing helpers.
- **`/src/store/`**: Global state management configuration using Zustand.
- **`/src/types.ts`**: Global TypeScript definitions defining the schemas for `Story`, `Chapter`, etc.

## How to Add New Features

1. **Identify the Scope**: Does the feature require backend changes? Does it need AI models? 
2. **Define Types First**: Start by updating `src/types.ts` with any new interfaces or enum modifications needed.
3. **Write Backend (if required)**: Add the API route in `server.ts` or `aiRouter.ts`. Provide appropriate prompts in `src/server/prompts.ts`.
4. **Update the Store**: If global state is necessary, add actions and state variables to `src/store/useAppStore.ts`.
5. **Create/Update Hooks**: Keep components clean. Encapsulate data-fetching and AI invocation logic into hooks within `src/hooks/`. Ensure JSDoc comments are provided for exported functions.
6. **Implement the UI**: Add or modify UI elements in `src/components/`. Follow our aesthetic guidelines (Tailwind CSS, clean aesthetics, responsive layouts).
7. **Test**: Run locally with `npm run dev` and ensure everything integrates seamlessly.

## Coding Standards

- **TypeScript**: Use strict typing. Avoid `any` where possible.
- **Styling**: Tailwind CSS is the standard. Follow the established color and typography palette.
- **Documentation**: Provide JSDoc comments for complex logic, state slices, and hooks.
