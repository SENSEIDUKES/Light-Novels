// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { VercelGcpAccessTokenProvider } from './vercelGcpCredential';

const NOW = Date.parse('2026-07-24T00:00:00.000Z');

function oidcToken(issuer: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iss: issuer })).toString('base64url');
  return `${header}.${payload}.signature`;
}

function successfulFetch() {
  return vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({
      access_token: 'federated-token',
      expires_in: 3_600,
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    .mockResolvedValueOnce(new Response(JSON.stringify({
      accessToken: 'impersonated-token',
      expireTime: '2026-07-24T01:00:00.000Z',
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
}

describe('VercelGcpAccessTokenProvider', () => {
  it('exchanges a team-issued Vercel token for the existing Firebase service account', async () => {
    const fetchMock = successfulFetch();
    const provider = new VercelGcpAccessTokenProvider({
      fetch: fetchMock as unknown as typeof fetch,
      now: () => NOW,
      getSubjectToken: () => oidcToken('https://oidc.vercel.com/seihouse'),
    });

    await expect(provider.getAccessToken()).resolves.toEqual({
      access_token: 'impersonated-token',
      expires_in: 3_600,
    });

    const [, stsInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const stsBody = new URLSearchParams(String(stsInit.body));
    expect(stsBody.get('audience')).toBe(
      '//iam.googleapis.com/projects/28157517738/locations/global/workloadIdentityPools/vercel/providers/vercel-team',
    );
    expect(stsBody.get('subject_token')).toBe(oidcToken('https://oidc.vercel.com/seihouse'));
    expect(fetchMock.mock.calls[1]?.[0]).toContain(
      'firebase-adminsdk-fbsvc%40seihouse-moduel.iam.gserviceaccount.com:generateAccessToken',
    );
  });

  it('supports Vercel global issuer mode without changing application secrets', async () => {
    const fetchMock = successfulFetch();
    const provider = new VercelGcpAccessTokenProvider({
      fetch: fetchMock as unknown as typeof fetch,
      now: () => NOW,
      getSubjectToken: () => oidcToken('https://oidc.vercel.com'),
    });

    await provider.getAccessToken();
    const [, stsInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const stsBody = new URLSearchParams(String(stsInit.body));
    expect(stsBody.get('audience')).toContain('/providers/vercel-global');
  });

  it('caches the short-lived Google access token until its refresh window', async () => {
    const fetchMock = successfulFetch();
    const provider = new VercelGcpAccessTokenProvider({
      fetch: fetchMock as unknown as typeof fetch,
      now: () => NOW,
      getSubjectToken: () => oidcToken('https://oidc.vercel.com/seihouse'),
    });

    await provider.getAccessToken();
    await provider.getAccessToken();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fails closed when no Vercel OIDC token is available', async () => {
    const provider = new VercelGcpAccessTokenProvider({
      env: {},
      getSubjectToken: () => undefined,
    });
    await expect(provider.getAccessToken()).rejects.toThrow('Vercel OIDC token is unavailable');
  });
});
