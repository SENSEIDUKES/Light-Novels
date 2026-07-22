# Secret Rotation & Security Policy

This document defines the zero-downtime secret rotation procedures for all third-party services and cloud credentials used in the **Light-Novels** platform.

---

## 1. Cloudflare R2 Credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`)

### Primary Purpose
Used by the server-side `R2ObjectStore` service to authenticate S3 API calls for uploading, retrieving, and managing private and public media assets.

### Frequency
Rotate every **90 days**, or immediately upon suspected compromise or team member offboarding.

### Step-by-Step Rotation Procedure
1. Log into the **Cloudflare Dashboard** -> **R2** -> **Manage R2 API Tokens**.
2. Click **Create API Token**.
3. Select **Edit** permissions for the `library` bucket (or all buckets).
4. Copy the new **Access Key ID** and **Secret Access Key**.
5. Update environment variables in your production environment (Vercel / Cloud Run / hosting provider):
   ```env
   R2_ACCESS_KEY_ID="<NEW_ACCESS_KEY_ID>"
   R2_SECRET_ACCESS_KEY="<NEW_SECRET_ACCESS_KEY>"
   ```
6. Redeploy the production backend.
7. Perform a verification upload test (e.g. generate a cultivator portrait or cover asset).
8. Return to Cloudflare Dashboard -> **Manage R2 API Tokens** and **Revoke** the old API token.

---

## 2. Gemini AI API Key (`GEMINI_API_KEY`)

### Primary Purpose
Used for story blueprint generation, chapter drafting, context handoffs, and AI vision prompt refining.

### Step-by-Step Rotation Procedure
1. Log into **Google AI Studio** (`aistudio.google.com`) or **GCP Console** -> **Credentials**.
2. Click **Create API Key**.
3. Apply restrictions to limit usage to the Gemini API service.
4. Update environment variables in production host / Vercel Secrets:
   ```env
   GEMINI_API_KEY="<NEW_GEMINI_API_KEY>"
   ```
5. Trigger a deployment / server restart.
6. Verify AI generation functionality by triggering a test generation route (`/api/test-image-gen` or story maker route).
7. Delete the old API key in Google AI Studio / GCP Console.

---

## 3. DeepL Auth Key (`DEEPL_AUTH_KEY`)

### Primary Purpose
Used for native chapter translation via the DeepL API.

### Step-by-Step Rotation Procedure
1. Log into **DeepL Pro / Developer Account Settings** (`deepl.com/pro-account/plan`).
2. Navigate to **Authentication Keys for DeepL API**.
3. Click **Create Key**.
4. Update production environment configuration:
   ```env
   DEEPL_AUTH_KEY="<NEW_DEEPL_AUTH_KEY>"
   ```
5. Verify translation endpoints (`/api/translate-chapter`).
6. Delete the legacy API key in DeepL account settings.

---

## 4. Firebase Admin / Service Account Credentials (`FIREBASE_SERVICE_ACCOUNT`)

### Primary Purpose
Used for server-side Firebase Authentication verification and DataConnect database mutations.

### Step-by-Step Rotation Procedure
1. Log into **Firebase Console** -> **Project Settings** -> **Service Accounts**.
2. Click **Generate New Private Key** (downloads JSON service account key).
3. Base64-encode or format the JSON payload for your environment deployment configuration.
4. Update `FIREBASE_SERVICE_ACCOUNT` / Application Default Credentials (ADC) in Cloud Run / Vercel secrets.
5. Deploy the backend service.
6. Delete the old private key from the Firebase Console **Service Accounts** key table.

---

## 5. Third-Party Provider Keys (`OPENROUTER_API_KEY`, `DEEPINFRA_API_KEY`)

### Step-by-Step Rotation Procedure
1. Issue new API keys from OpenRouter (`openrouter.ai/keys`) and DeepInfra (`deepinfra.com/dash/api_keys`).
2. Update production environment variables.
3. Revoke former keys in respective provider dashboards.

---

## 6. Audit & Emergency Incident Response

* All secret modifications must be logged in the repository audit history.
* Never commit production secrets directly into git repositories or `.env.example` templates.
* `.env` files are strictly ignored via [.gitignore](file:///c:/Users/amaur/OneDrive/Documents/GitHub/Light-Novels/.gitignore).
