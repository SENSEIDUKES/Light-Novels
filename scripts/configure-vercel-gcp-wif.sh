#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-seihouse-moduel}"
PROJECT_NUMBER="${GCP_PROJECT_NUMBER:-28157517738}"
POOL_ID="${GCP_WORKLOAD_IDENTITY_POOL_ID:-vercel}"
TEAM_PROVIDER_ID="${GCP_WORKLOAD_IDENTITY_TEAM_PROVIDER_ID:-vercel-team}"
GLOBAL_PROVIDER_ID="${GCP_WORKLOAD_IDENTITY_GLOBAL_PROVIDER_ID:-vercel-global}"
SERVICE_ACCOUNT_EMAIL="${GCP_SERVICE_ACCOUNT_EMAIL:-firebase-adminsdk-fbsvc@seihouse-moduel.iam.gserviceaccount.com}"
VERCEL_TEAM_SLUG="${VERCEL_TEAM_SLUG:-seihouse}"
VERCEL_PROJECT_NAME="${VERCEL_PROJECT_NAME:-light-novels}"

create_provider() {
  local provider_id="$1"
  local issuer_uri="$2"
  if gcloud iam workload-identity-pools providers describe "$provider_id" \
    --project="$PROJECT_ID" \
    --location=global \
    --workload-identity-pool="$POOL_ID" >/dev/null 2>&1; then
    echo "Provider $provider_id already exists."
    return
  fi
  gcloud iam workload-identity-pools providers create-oidc "$provider_id" \
    --project="$PROJECT_ID" \
    --location=global \
    --workload-identity-pool="$POOL_ID" \
    --display-name="Vercel ${provider_id}" \
    --issuer-uri="$issuer_uri" \
    --allowed-audiences="https://vercel.com/${VERCEL_TEAM_SLUG}" \
    --attribute-mapping="google.subject=assertion.sub"
}

gcloud config set project "$PROJECT_ID" >/dev/null
gcloud services enable \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  --project="$PROJECT_ID"

if ! gcloud iam workload-identity-pools describe "$POOL_ID" \
  --project="$PROJECT_ID" --location=global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL_ID" \
    --project="$PROJECT_ID" \
    --location=global \
    --display-name="Vercel"
fi

create_provider "$TEAM_PROVIDER_ID" "https://oidc.vercel.com/${VERCEL_TEAM_SLUG}"
create_provider "$GLOBAL_PROVIDER_ID" "https://oidc.vercel.com"

for environment in preview production; do
  member="principal://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/subject/owner:${VERCEL_TEAM_SLUG}:project:${VERCEL_PROJECT_NAME}:environment:${environment}"
  gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT_EMAIL" \
    --project="$PROJECT_ID" \
    --role="roles/iam.workloadIdentityUser" \
    --member="$member"
done

echo "Vercel preview and production may now impersonate ${SERVICE_ACCOUNT_EMAIL} without a private key."
