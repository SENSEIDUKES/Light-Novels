import { describe, it, expect } from 'vitest';
import { getSystemInferredType, getSystemColorMeaning, getSystemPromptColor } from './systemColors';

describe('systemColors', () => {
  describe('getSystemInferredType', () => {
    it('returns other for empty or undefined context', () => {
      expect(getSystemInferredType()).toBe('other');
      expect(getSystemInferredType('')).toBe('other');
    });

    it.each([
      ['combat artifact found', 'combat_artifact'],
      ['combat breakthrough achieved', 'combat_breakthrough'],
      ['heavenly tribulation breakthrough', 'heavenly_tribulation'],
      ['divine trial', 'heavenly_tribulation']
    ])('identifies %s as %s', (input, expected) => {
      expect(getSystemInferredType(input)).toBe(expected);
    });

    it.each([
      ['system error', 'system_error'],
      ['unstable', 'system_error'],
      ['glitch', 'system_error'],
      ['malfunction', 'system_error'],
      ['iron fate warning', 'system_error']
    ])('identifies %s as %s', (input, expected) => {
      expect(getSystemInferredType(input)).toBe(expected);
    });

    it.each([
      ['karma backlash', 'choice_consequence'],
      ['choice_consequence', 'choice_consequence'],
      ['remembers', 'choice_consequence'],
      ['consequence', 'choice_consequence'],
      ['decision', 'choice_consequence']
    ])('identifies %s as %s', (input, expected) => {
      expect(getSystemInferredType(input)).toBe(expected);
    });

    it.each([
      ['danger', 'critical_danger'],
      ['critical', 'critical_danger'],
      ['death threat', 'critical_danger'],
      ['hostile', 'critical_danger'],
      ['enemy', 'critical_danger']
    ])('identifies %s as %s', (input, expected) => {
      expect(getSystemInferredType(input)).toBe(expected);
    });

    it.each([
      ['death flag', 'corruption'],
      ['death', 'corruption'],
      ['corruption', 'corruption'],
      ['permanent', 'corruption'],
      ['curse', 'corruption'],
      ['tragedy', 'corruption']
    ])('identifies %s as %s', (input, expected) => {
      expect(getSystemInferredType(input)).toBe(expected);
    });

    it.each([
      ['breakthrough', 'breakthrough'],
      ['evolution', 'breakthrough'],
      ['level up', 'breakthrough'],
      ['level-up', 'breakthrough'],
      ['ascension', 'breakthrough'],
      ['legendary', 'breakthrough'],
      ['awakening', 'breakthrough']
    ])('identifies %s as %s', (input, expected) => {
      expect(getSystemInferredType(input)).toBe(expected);
    });

    it.each([
      ['loot', 'reward'],
      ['qi gain', 'reward'],
      ['achievement', 'reward'],
      ['reward', 'reward'],
      ['gain', 'reward']
    ])('identifies %s as %s', (input, expected) => {
      expect(getSystemInferredType(input)).toBe(expected);
    });

    it.each([
      ['romance', 'romance'],
      ['bond', 'romance'],
      ['affection', 'romance'],
      ['karmic affinity', 'romance'],
      ['relationship', 'romance']
    ])('identifies %s as %s', (input, expected) => {
      expect(getSystemInferredType(input)).toBe(expected);
    });

    it.each([
      ['warning', 'warning'],
      ['risk', 'warning'],
      ['instability', 'warning'],
      ['pressure', 'warning']
    ])('identifies %s as %s', (input, expected) => {
      expect(getSystemInferredType(input)).toBe(expected);
    });

    it.each([
      ['fate lock', 'mystery'],
      ['fate event', 'mystery'],
      ['mystery', 'mystery'],
      ['fate', 'mystery'],
      ['unknown', 'mystery'],
      ['prophecy', 'mystery'],
      ['truth', 'mystery']
    ])('identifies %s as %s', (input, expected) => {
      expect(getSystemInferredType(input)).toBe(expected);
    });

    it.each([
      ['friendly', 'codex_update'],
      ['update', 'codex_update'],
      ['quest', 'codex_update'],
      ['info', 'codex_update'],
      ['codex', 'codex_update'],
      ['scan', 'codex_update'],
      ['record', 'codex_update']
    ])('identifies %s as %s', (input, expected) => {
      expect(getSystemInferredType(input)).toBe(expected);
    });

    it.each([
      ['progress', 'progression'],
      ['stable', 'progression'],
      ['growth', 'progression'],
      ['training', 'progression']
    ])('identifies %s as %s', (input, expected) => {
      expect(getSystemInferredType(input)).toBe(expected);
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
      expect(getSystemColorMeaning(undefined, 'heavenly tribulation').type).toBe('heavenly_tribulation');
    });
  });

  describe('getSystemPromptColor', () => {
    it.each([
      ['codex_update', 'rgba(59,130,246,0.15)'], // blue
      ['progression', 'rgba(34,197,94,0.15)'], // green
      ['breakthrough', 'rgba(251,191,36,0.15)'], // amber
      ['warning', 'rgba(249,115,22,0.15)'], // orange
      ['critical_danger', 'rgba(239,68,68,0.15)'], // red
      ['system_error', 'rgba(239,68,68,0.25)'], // red glitch (special case in source file)
      ['corruption', 'rgba(159,18,57,0.25)'], // rose (special case in source file)
      ['mystery', 'rgba(168,85,247,0.15)'], // purple
      ['romance', 'rgba(236,72,153,0.15)'], // pink
      ['other', 'rgba(107,114,128,0.15)'] // default gray
    ])('maps %s to correct shadow color %s', (type, expectedColor) => {
      const color = getSystemPromptColor(type);
      expect(color).toContain(expectedColor);
    });

    it('adds special effects for system_error', () => {
      const color = getSystemPromptColor('system_error');
      expect(color).toContain('animate-pulse');
    });

    it('handles new multi-match types in prompt color', () => {
      const color = getSystemPromptColor('heavenly_tribulation');
      expect(color).toContain('text-purple-400');
      expect(color).toContain('shadow-[');
    });
  });
});
