import { describe, it, expect } from 'vitest';
import { getSystemInferredType, getSystemColorMeaning, getSystemPromptColor } from './systemColors';

describe('systemColors', () => {
  describe('getSystemInferredType', () => {
    it('returns other for empty or undefined context', () => {
      expect(getSystemInferredType()).toBe('other');
      expect(getSystemInferredType('')).toBe('other');
    });

    it('identifies multi-match types first', () => {
      expect(getSystemInferredType('combat artifact found')).toBe('combat_artifact');
      expect(getSystemInferredType('combat breakthrough achieved')).toBe('combat_breakthrough');
      expect(getSystemInferredType('heavenly tribulation breakthrough')).toBe('heavenly_tribulation');
    });

    it('identifies system_error', () => {
      expect(getSystemInferredType('system error detected')).toBe('system_error');
      expect(getSystemInferredType('unstable reality')).toBe('system_error');
    });

    it('identifies choice_consequence', () => {
      expect(getSystemInferredType('karma backlash incoming')).toBe('choice_consequence');
      expect(getSystemInferredType('the world remembers your choice')).toBe('choice_consequence');
    });

    it('identifies critical_danger', () => {
      expect(getSystemInferredType('critical danger')).toBe('critical_danger');
      expect(getSystemInferredType('enemy spotted')).toBe('critical_danger');
    });

    it('identifies corruption', () => {
      expect(getSystemInferredType('death flag triggered')).toBe('corruption');
      expect(getSystemInferredType('permanent curse')).toBe('corruption');
    });

    it('identifies breakthrough', () => {
      expect(getSystemInferredType('breakthrough achieved')).toBe('breakthrough');
      expect(getSystemInferredType('legendary level up')).toBe('breakthrough');
    });

    it('identifies reward', () => {
      expect(getSystemInferredType('loot obtained')).toBe('reward');
      expect(getSystemInferredType('qi gain incremented')).toBe('reward');
    });

    it('identifies romance', () => {
      expect(getSystemInferredType('romance blooming')).toBe('romance');
      expect(getSystemInferredType('karmic affinity strengthened')).toBe('romance');
    });

    it('identifies warning', () => {
      expect(getSystemInferredType('warning: pressure rising')).toBe('warning');
    });

    it('identifies mystery', () => {
      expect(getSystemInferredType('fate lock active')).toBe('mystery');
      expect(getSystemInferredType('unknown truth')).toBe('mystery');
    });

    it('identifies codex_update', () => {
      expect(getSystemInferredType('codex record updated')).toBe('codex_update');
      expect(getSystemInferredType('friendly scan')).toBe('codex_update');
    });

    it('identifies progression', () => {
      expect(getSystemInferredType('training progress')).toBe('progression');
      expect(getSystemInferredType('stable growth')).toBe('progression');
    });

    it('returns other for unknown context', () => {
      expect(getSystemInferredType('random text')).toBe('other');
    });
  });

  describe('getSystemColorMeaning', () => {
    it('returns specific meaning if promptType is provided', () => {
      const meaning = getSystemColorMeaning('breakthrough');
      expect(meaning.type).toBe('breakthrough');
    });

    it('handles aliases correctly', () => {
      expect(getSystemColorMeaning('friendly_scan').type).toBe('codex_update');
      expect(getSystemColorMeaning('enemy_scan').type).toBe('critical_danger');
      expect(getSystemColorMeaning('death_event').type).toBe('corruption');
      expect(getSystemColorMeaning('fate_event').type).toBe('mystery');
      expect(getSystemColorMeaning('karmic_bond').type).toBe('romance');
    });

    it('infers type from context if promptType is missing', () => {
      expect(getSystemColorMeaning(undefined, 'system error').type).toBe('system_error');
    });

    it('defaults to neutral if type is unknown', () => {
      expect(getSystemColorMeaning('unknown_type').type).toBe('neutral');
    });

    it('handles new multi-match types correctly', () => {
      expect(getSystemColorMeaning(undefined, 'combat artifact').type).toBe('combat_artifact');
    });
  });

  describe('getSystemPromptColor', () => {
    it('returns a string with colors and shadows', () => {
      const color = getSystemPromptColor('breakthrough');
      expect(color).toContain('text-amber-400');
      expect(color).toContain('shadow-[');
    });

    it('adds special effects for system_error', () => {
      const color = getSystemPromptColor('system_error');
      expect(color).toContain('animate-pulse');
    });

    it('adds special shadows for corruption', () => {
      const color = getSystemPromptColor('corruption');
      expect(color).toContain('rgba(159,18,57,0.25)');
    });

    it('handles new multi-match types in prompt color', () => {
      const color = getSystemPromptColor('heavenly_tribulation');
      expect(color).toContain('text-purple-400');
      expect(color).toContain('shadow-[');
    });
  });
});
