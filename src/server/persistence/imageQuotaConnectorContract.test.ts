// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const mutations = readFileSync('dataconnect/connector/mutations.gql', 'utf8').replace(
  /\r\n/g,
  '\n',
);

function operation(name: string): string {
  const start = mutations.indexOf(`mutation ${name}(`);
  if (start < 0) throw new Error(`Could not locate ${name} in the connector.`);
  const nextMutation = mutations.indexOf('\nmutation ', start + 1);
  const end = nextMutation < 0 ? mutations.length : nextMutation;
  return mutations.slice(start, end);
}

describe('image quota Data Connect contracts', () => {
  it('executes the quota charge and receipt insert as separate transactional writes', () => {
    const quota = operation('AdminConsumeImageGenerationQuota');

    expect(quota).toContain('@auth(level: NO_ACCESS) @transaction');
    expect(quota).toContain('charged: _executeReturningFirst(');
    expect(quota).toContain('UPDATE user_profile');
    expect(quota).toContain('user_uid AS "userUid"');
    expect(quota).toContain('image_generation_count AS "imageGenerationCount"');
    expect(quota).toContain('image_quota_reset_at AS "imageQuotaResetAt"');
    expect(quota).toContain('consumed: _executeReturningFirst(');
    expect(quota).toContain('INSERT INTO image_quota_consumption');
    expect(quota).toContain('RETURNING owner_uid AS "ownerUid"');
    expect(quota).toContain(
      '{_expr: "response.charged == null ? null : response.charged.imageGenerationCount"}',
    );
    expect(quota).toContain(
      '{_expr: "response.charged == null ? null : response.charged.imageQuotaResetAt"}',
    );
    expect(quota).toContain('CAST($4 AS timestamptz) IS NOT NULL');
    expect(quota).not.toContain('FROM user_profile');
    expect(quota.indexOf('UPDATE user_profile')).toBeLessThan(
      quota.indexOf('INSERT INTO image_quota_consumption'),
    );
    expect(quota.match(/NOT EXISTS \(/g)).toHaveLength(2);
    expect(quota).not.toContain('charged: _execute(');
    expect(quota).not.toContain('consumed: _execute(');
    expect(quota).not.toMatch(
      /WITH\s+\w+\s+AS\s*\(\s*(?:INSERT|UPDATE|DELETE)/i,
    );
  });
});
