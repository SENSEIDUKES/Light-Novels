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
    expect(PROMPTS.initialArc.userPrompt('{}', [], 5)).toContain('{}');
  });

  it('renders a valid JSON example for the initial arc response', () => {
    const prompt = PROMPTS.initialArc.userPrompt('{}', ['A thread with "quotes"'], 5);
    const responseShape = prompt.match(/Return exactly one valid JSON object with this shape:\n([\s\S]*?)\n\nGenerate exactly/)?.[1];

    expect(responseShape).toBeDefined();
    expect(() => JSON.parse(responseShape!)).not.toThrow();
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

  it('treats aliases and author context as input-only user canon', () => {
    const rendered = PROMPTS.chapter.userPrompt(
      1,
      'Test Chapter',
      'Test Premise',
      'Test MC',
      'Fantasy',
      'Premise',
      '{}',
      '[]',
      false,
    );

    expect(PROMPTS.chapter.system).toContain('AUTHOR-CONTROLLED IDENTITY');
    expect(PROMPTS.chapter.system).toContain('Never invent additional aliases or titles');
    expect(PROMPTS.chapter.nonStreamSystem).toContain('Never create, propose, rename, or update aliases');
    expect(rendered).toContain('AUTHOR CONTEXT AUTHORITY');
    expect(rendered).not.toContain('"aliases": [');
  });

  it('uses the v2 assembly as the single source of chapter premise context', () => {
    const rendered = PROMPTS.chapter.userPrompt(
      2,
      'The Gate',
      'UNIQUE_GOAL',
      'Lin',
      'Xianxia',
      'UNIQUE_CORE',
      '--- CURRENT CHAPTER PREMISE ---\nGoal: UNIQUE_GOAL\nCore premise: UNIQUE_CORE',
      '',
      true,
      undefined,
      undefined,
      undefined,
      'v2',
    );

    expect(rendered).toContain('CONTEXT ENGINE V2 ASSEMBLY');
    expect(rendered).not.toContain('PAST SUMMARY CONTEXT');
    expect(rendered.match(/UNIQUE_GOAL/g)).toHaveLength(1);
    expect(rendered.match(/UNIQUE_CORE/g)).toHaveLength(1);
  });
  
  describe('cross-genre system panels', () => {
    it('limits only World Card TTS audio text to a natural 60-character line', () => {
      expect(PROMPTS.chapter.system).toContain('"audioText"');
      expect(PROMPTS.chapter.system).toContain('sound description; maximum 60 written characters');
      expect(PROMPTS.chapter.system).toContain('naturally rewrite it to preserve its main meaning and tone');
      expect(PROMPTS.chapter.system).toContain('never cut it off mid-word or mid-sentence');
    });

    it('restricts World Card location and faction sound roles', () => {
      expect(PROMPTS.chapter.system).toContain('location exactly "signature"');
      expect(PROMPTS.chapter.system).toContain('faction exactly "chant"');
      expect(PROMPTS.chapter.system).toContain('Never use location "ambience" or faction "horn", "bell", or "ceremony"');
    });

    it('offers Celestial Library system panels to every genre in the streamed system prompt', () => {
      expect(PROMPTS.chapter.system).toContain('CELESTIAL LIBRARY SYSTEM PANELS (ALL GENRES)');
      expect(PROMPTS.chapter.system).toContain('not just System/LitRPG stories');
      expect(PROMPTS.chapter.system).not.toContain('In non-System/LitRPG stories, prefer natural prose');
    });

    it('offers Celestial Library system panels to every genre in the non-streamed system prompt', () => {
      expect(PROMPTS.chapter.nonStreamSystem).toContain('CELESTIAL LIBRARY SYSTEM PANELS (ALL GENRES)');
      expect(PROMPTS.chapter.nonStreamSystem).toContain('not just System/LitRPG stories');
      expect(PROMPTS.chapter.nonStreamSystem).not.toContain('In non-System/LitRPG stories, prefer natural prose');
    });

    it('keeps genre-aware intensity guidance in both generation paths', () => {
      for (const prompt of [PROMPTS.chapter.system, PROMPTS.chapter.nonStreamSystem]) {
        expect(prompt).toContain('Explicit System/LitRPG stories: panels may be frequent and openly mechanical');
        expect(prompt).toContain('Cultivation, fantasy, progression, academy, crafting, beast-taming');
        expect(prompt).toContain('Romance, mystery, cozy, political, and grounded stories: rare panels');
        expect(prompt).toContain('Do not force a panel into every chapter');
        expect(prompt).toContain('never restricted to Fate events alone');
      }
    });

    it('preserves PR #90 narrative surface hygiene in both generation paths', () => {
      for (const prompt of [PROMPTS.chapter.system, PROMPTS.chapter.nonStreamSystem]) {
        expect(prompt).toContain('NARRATIVE SURFACE HYGIENE');
        expect(prompt).toContain('control signals only');
        expect(prompt).toContain('must not appear verbatim in normal narration or dialogue');
      }
      expect(PROMPTS.chapter.system).toContain('never put bracketed alerts inside paragraph or dialogue text');
      expect(PROMPTS.chapter.nonStreamSystem).toContain('never embed bracketed alerts or control labels inside narration or dialogue sentences');
    });

    it('requires promptType on structured system objects and includes it in the NDJSON example', () => {
      expect(PROMPTS.chapter.system).toContain('ALWAYS set "promptType"');
      expect(PROMPTS.chapter.system).toContain('"promptType": "breakthrough"');
    });

    it('instructs the streamed user prompt to allow panels in every genre', () => {
      const rendered = PROMPTS.chapter.userPrompt(1, 'T', 'P', 'MC', 'Cultivation', 'CP', '{}', '[]', true);
      expect(rendered).toContain('available in EVERY genre');
      expect(rendered).toContain('structured "system" object');
      expect(rendered).toContain('never force an empty panel');
      expect(rendered).not.toContain('For "System" or "LitRPG" styles');
    });

    it('instructs the non-streamed user prompt to allow standalone bracketed panels in every genre', () => {
      const rendered = PROMPTS.chapter.userPrompt(1, 'T', 'P', 'MC', 'Cozy mystery', 'CP', '{}', '[]', false);
      expect(rendered).toContain('available in EVERY genre');
      expect(rendered).toContain('standalone bracketed system line');
      expect(rendered).toContain('never force an empty panel');
      expect(rendered).not.toContain('keep system events in natural prose');
    });
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
