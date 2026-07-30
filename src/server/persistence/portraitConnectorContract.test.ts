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

describe('portrait Data Connect contracts', () => {
  it('accepts only READY account-scoped Celestial Portrait images for selection', () => {
    const selection = operation('AdminSelectUserPortrait');

    expect(selection).toContain("assetType @check(expr: \"this == 'IMAGE'\"");
    expect(selection).toContain("purpose @check(expr: \"this == 'CELESTIAL_PORTRAIT'\"");
    expect(selection).toContain('storyId @check(expr: "this == null"');
  });

  it('recovers account portrait assets directly without requiring a story media slot', () => {
    const recovery = operation('AdminRecoverPendingUserPortraits');

    expect(recovery).toContain('FROM media_asset AS asset');
    expect(recovery).not.toContain('FROM media_slot');
    expect(recovery).toContain("asset.purpose = 'CELESTIAL_PORTRAIT'");
    expect(recovery).toContain('asset.story_id IS NULL');
    expect(recovery).toContain('SELECT 1 FROM user_portrait');
    expect(recovery).toContain('asset.created_at > profile.active_selected_at');
    expect(recovery).toContain('FOR UPDATE OF profile');
    expect(recovery).toContain('recoveredPortrait: _executeReturningFirst(');
    expect(recovery).toContain('RETURNING asset_id AS "assetId"');
    expect(recovery).toContain(
      'WHERE user_uid = $1\n        AND CAST($2 AS uuid) IS NOT NULL\n        AND asset_id <> $2',
    );
    expect(recovery).toContain(
      '{_expr: "response.recoveredPortrait == null ? null : response.recoveredPortrait.assetId"}',
    );
    expect(recovery).toContain('deactivated: _executeReturning(');
    expect(recovery).toContain('RETURNING asset_id AS "assetId"');
    expect(recovery).toContain('updatedProfile: _executeReturningFirst(');
    expect(recovery).toContain(
      'SET active_portrait_asset_id = $2,\n          sync_revision = $3,',
    );
    expect(recovery).toContain('sync_revision AS "syncRevision"');
    expect(recovery).toContain('revision AS "revision"');
    expect(recovery).toContain('recovered: _executeReturningFirst(');
    expect(recovery).toContain(
      '{_expr: "response.updatedProfile == null ? null : response.updatedProfile.syncRevision"}',
    );
    expect(recovery).toContain(
      '{_expr: "response.updatedProfile == null ? null : response.updatedProfile.revision"}',
    );
    expect(recovery).toContain('CAST($3 AS bigint) IS NOT NULL');
    const recoveredAggregate = recovery.slice(recovery.indexOf('recovered:'));
    expect(recoveredAggregate).not.toContain('FROM user_profile');
    expect(recovery).toContain('RETURNING owner_uid AS "ownerUid"');
    expect(recovery).not.toContain('deactivated: _execute(');
    expect(recovery).not.toContain('recovered: _execute(');
  });
});
