// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const mutations = readFileSync('dataconnect/connector/mutations.gql', 'utf8');

function operation(name: string, nextName: string): string {
  const start = mutations.indexOf(`mutation ${name}(`);
  const end = mutations.indexOf(`mutation ${nextName}(`, start + 1);
  if (start < 0 || end < 0) throw new Error(`Could not locate ${name} in the connector.`);
  return mutations.slice(start, end);
}

describe('portrait Data Connect contracts', () => {
  it('accepts only READY account-scoped Celestial Portrait images for selection', () => {
    const selection = operation('AdminSelectUserPortrait', 'AdminEnsureMediaDeletionIntent');

    expect(selection).toContain("assetType @check(expr: \"this == 'IMAGE'\"");
    expect(selection).toContain("purpose @check(expr: \"this == 'CELESTIAL_PORTRAIT'\"");
    expect(selection).toContain('storyId @check(expr: "this == null"');
  });

  it('recovers account portrait assets directly without requiring a story media slot', () => {
    const recovery = operation('AdminRecoverPendingUserPortraits', 'AdminUpdateAccountAccess');

    expect(recovery).toContain('FROM media_asset AS asset');
    expect(recovery).not.toContain('FROM media_slot');
    expect(recovery).toContain("asset.purpose = 'CELESTIAL_PORTRAIT'");
    expect(recovery).toContain('asset.story_id IS NULL');
    expect(recovery).toContain('SELECT 1 FROM user_portrait');
    expect(recovery).toContain('asset.created_at > profile.active_selected_at');
    expect(recovery).toContain('FOR UPDATE OF profile');
  });
});
