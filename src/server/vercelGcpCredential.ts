import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';
import type { AppOptions } from 'firebase-admin/app';

const CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const TOKEN_EXCHANGE_GRANT = 'urn:ietf:params:oauth:grant-type:token-exchange';
const ACCESS_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:access_token';
const JWT_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:jwt';
const DEFAULT_PROJECT_NUMBER = '28157517738';
const DEFAULT_POOL_ID = 'vercel';
const DEFAULT_TEAM_PROVIDER_ID = 'vercel-team';
const DEFAULT_GLOBAL_PROVIDER_ID = 'vercel-global';
const DEFAULT_SERVICE_ACCOUNT_EMAIL =
  'firebase-adminsdk-fbsvc@seihouse-moduel.iam.gserviceaccount.com';
const TOKEN_REFRESH_WINDOW_MS = 60_000;

type FirebaseCredential = NonNullable<AppOptions['credential']>;
type FetchLike = typeof globalThis.fetch;

interface CachedAccessToken {
  access_token: string;
  expiresAt: number;
}

interface VercelGcpCredentialOptions {
  env?: NodeJS.ProcessEnv;
  fetch?: FetchLike;
  now?: () => number;
  getSubjectToken?: () => string | undefined;
}

const vercelOidcTokenContext = new AsyncLocalStorage<string | undefined>();
let latestVercelOidcToken: string | undefined;

export function captureVercelOidcToken(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  const token = request.get('x-vercel-oidc-token')?.trim() || undefined;
  if (token) latestVercelOidcToken = token;
  vercelOidcTokenContext.run(token, next);
}

function decodeIssuer(subjectToken: string): string {
  const segments = subjectToken.split('.');
  if (segments.length !== 3) throw new Error('The Vercel OIDC token is malformed.');
  try {
    const payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8')) as unknown;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('OIDC payload must be an object.');
    }
    const issuer = (payload as Record<string, unknown>).iss;
    if (typeof issuer !== 'string' || !issuer) throw new Error('OIDC issuer is missing.');
    return issuer;
  } catch (error) {
    throw new Error('The Vercel OIDC token issuer could not be read.', { cause: error });
  }
}

function responseError(label: string, response: Response): Promise<Error> {
  return response.text().then(body => {
    const compact = body.replace(/\s+/g, ' ').trim().slice(0, 500);
    return new Error(`${label} failed (${response.status})${compact ? `: ${compact}` : '.'}`);
  });
}

export class VercelGcpAccessTokenProvider {
  private readonly env: NodeJS.ProcessEnv;
  private readonly fetchImpl: FetchLike;
  private readonly now: () => number;
  private readonly subjectTokenSupplier: () => string | undefined;
  private cached?: CachedAccessToken;
  private pending?: Promise<CachedAccessToken>;

  constructor(options: VercelGcpCredentialOptions = {}) {
    this.env = options.env ?? process.env;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.now = options.now ?? Date.now;
    this.subjectTokenSupplier = options.getSubjectToken ?? (() => (
      vercelOidcTokenContext.getStore()
      ?? latestVercelOidcToken
      ?? this.env.VERCEL_OIDC_TOKEN?.trim()
      ?? undefined
    ));
  }

  private providerId(subjectToken: string): string {
    const issuer = decodeIssuer(subjectToken);
    if (issuer === 'https://oidc.vercel.com/seihouse') {
      return this.env.GCP_WORKLOAD_IDENTITY_TEAM_PROVIDER_ID?.trim()
        || DEFAULT_TEAM_PROVIDER_ID;
    }
    if (issuer === 'https://oidc.vercel.com') {
      return this.env.GCP_WORKLOAD_IDENTITY_GLOBAL_PROVIDER_ID?.trim()
        || DEFAULT_GLOBAL_PROVIDER_ID;
    }
    throw new Error(`Unsupported Vercel OIDC issuer: ${issuer}`);
  }

  private async exchange(): Promise<CachedAccessToken> {
    const subjectToken = this.subjectTokenSupplier();
    if (!subjectToken) {
      throw new Error(
        'Vercel OIDC token is unavailable. Ensure this code runs inside a Vercel Function or set VERCEL_OIDC_TOKEN for local development.',
      );
    }

    const projectNumber = this.env.GCP_PROJECT_NUMBER?.trim() || DEFAULT_PROJECT_NUMBER;
    const poolId = this.env.GCP_WORKLOAD_IDENTITY_POOL_ID?.trim() || DEFAULT_POOL_ID;
    const providerId = this.providerId(subjectToken);
    const serviceAccountEmail = this.env.GCP_SERVICE_ACCOUNT_EMAIL?.trim()
      || DEFAULT_SERVICE_ACCOUNT_EMAIL;
    const audience = `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`;

    const stsResponse = await this.fetchImpl('https://sts.googleapis.com/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        audience,
        grant_type: TOKEN_EXCHANGE_GRANT,
        requested_token_type: ACCESS_TOKEN_TYPE,
        scope: CLOUD_PLATFORM_SCOPE,
        subject_token: subjectToken,
        subject_token_type: JWT_TOKEN_TYPE,
      }),
    });
    if (!stsResponse.ok) throw await responseError('Google Security Token exchange', stsResponse);
    const federated = await stsResponse.json() as {
      access_token?: unknown;
      expires_in?: unknown;
    };
    if (typeof federated.access_token !== 'string' || !federated.access_token) {
      throw new Error('Google Security Token exchange did not return an access token.');
    }

    const impersonationResponse = await this.fetchImpl(
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(serviceAccountEmail)}:generateAccessToken`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${federated.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scope: [CLOUD_PLATFORM_SCOPE], lifetime: '3600s' }),
      },
    );
    if (!impersonationResponse.ok) {
      throw await responseError('Google service-account impersonation', impersonationResponse);
    }
    const impersonated = await impersonationResponse.json() as {
      accessToken?: unknown;
      expireTime?: unknown;
    };
    if (typeof impersonated.accessToken !== 'string' || !impersonated.accessToken) {
      throw new Error('Google service-account impersonation did not return an access token.');
    }
    const expiresAt = typeof impersonated.expireTime === 'string'
      ? Date.parse(impersonated.expireTime)
      : Number.NaN;
    if (!Number.isFinite(expiresAt) || expiresAt <= this.now()) {
      throw new Error('Google service-account impersonation returned an invalid expiration time.');
    }

    return {
      access_token: impersonated.accessToken,
      expiresAt,
    };
  }

  private present(token: CachedAccessToken): { access_token: string; expires_in: number } {
    return {
      access_token: token.access_token,
      expires_in: Math.max(1, Math.floor((token.expiresAt - this.now()) / 1_000)),
    };
  }

  async getAccessToken(): Promise<{ access_token: string; expires_in: number }> {
    if (this.cached && this.cached.expiresAt - TOKEN_REFRESH_WINDOW_MS > this.now()) {
      return this.present(this.cached);
    }
    this.pending ??= this.exchange().finally(() => {
      this.pending = undefined;
    });
    this.cached = await this.pending;
    return this.present(this.cached);
  }
}

export function createVercelGcpCredential(
  options: VercelGcpCredentialOptions = {},
): FirebaseCredential {
  const provider = new VercelGcpAccessTokenProvider(options);
  return { getAccessToken: () => provider.getAccessToken() };
}
