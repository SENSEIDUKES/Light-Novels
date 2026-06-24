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

  it('should have a chapter prompt', () => {
    expect(PROMPTS.chapter).toBeDefined();
    expect(PROMPTS.chapter.system).toBeDefined();
    expect(typeof PROMPTS.chapter.userPrompt).toBe('function');
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
});
