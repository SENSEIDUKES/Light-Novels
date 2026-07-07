import { describe, it, expect } from 'vitest';
import { PROMPTS } from './prompts';

describe('Prompts', () => {
  it('should have a blueprint prompt', () => {
    expect(PROMPTS.blueprint).toBeDefined();
    expect(PROMPTS.blueprint.system).toBeDefined();
    expect(typeof PROMPTS.blueprint.userPrompt).toBe('function');
    expect(PROMPTS.blueprint.userPrompt('{}')).toContain('{}');
  });

  it('should have an initialArc prompt', () => {
    expect(PROMPTS.initialArc).toBeDefined();
    expect(PROMPTS.initialArc.system).toBeDefined();
    expect(typeof PROMPTS.initialArc.userPrompt).toBe('function');
    expect(PROMPTS.initialArc.userPrompt('{}', 'power', [], 5)).toContain('{}');
  });

  it('should have a chapter prompt and render styleBible if provided', () => {
    expect(PROMPTS.chapter).toBeDefined();
    expect(PROMPTS.chapter.system).toBeDefined();
    expect(typeof PROMPTS.chapter.userPrompt).toBe('function');

    const rendered = PROMPTS.chapter.userPrompt(
      1,
      'Test Chapter',
      'Test Premise',
      'Test MC',
      'Cozy farming',
      'Test Custom Premise',
      '{}',
      '[]',
      false,
      'My Custom Style Bible',
      'My Custom Trope Rules',
      ['farming', 'cozy']
    );

    expect(rendered).toContain('STYLE DIRECTIVE — obey this over generic conventions');
    expect(rendered).toContain('My Custom Style Bible');
    expect(rendered).toContain('My Custom Trope Rules');
    expect(rendered).toContain('farming, cozy');
  });
  
  it('should have a glossary prompt', () => {
    expect(PROMPTS.glossary).toBeDefined();
    expect(PROMPTS.glossary.system).toBeDefined();
    expect(typeof PROMPTS.glossary.userPrompt).toBe('function');
  });

  it('should have a consistencyGuard prompt', () => {
    expect(PROMPTS.consistencyGuard).toBeDefined();
    expect(PROMPTS.consistencyGuard.system).toBeDefined();
    expect(typeof PROMPTS.consistencyGuard.userPrompt).toBe('function');
  });

  it('should have an extractMetadata prompt', () => {
    expect(PROMPTS.extractMetadata).toBeDefined();
    expect(PROMPTS.extractMetadata.system).toBeDefined();
    expect(typeof PROMPTS.extractMetadata.userPrompt).toBe('function');
  });

  it('extractMetadata (tagger) owns memory + chapter cue, not per-block metadata', () => {
    const prompt = PROMPTS.extractMetadata.userPrompt(4, 'A Title', 'Some chapter prose.');
    // Still owns memory + chapter-level cue scalars + summary.
    expect(prompt).toContain('memoryUpdates');
    expect(prompt).toContain('cuePayload');
    expect(prompt).toContain('summary');
    // No longer re-derives per-block metadata the author already emits (unconsumed dupes).
    expect(prompt).not.toContain("'entities' array");
    expect(prompt).not.toContain("backing 'music' object");
    expect(prompt).not.toContain('beastEvent');
    // Ownership is stated explicitly.
    expect(prompt).toContain('single source of truth');
  });
});
