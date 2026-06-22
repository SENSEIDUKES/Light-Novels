import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChapterTranslation } from './useChapterTranslation';
import { storyStorage } from '../lib/storage';
import { firebaseStorage } from '../lib/firebaseStorage';

// Mock dependencies
vi.mock('../lib/storage', () => ({
  storyStorage: {
    getChapterContent: vi.fn(),
    saveChapterContent: vi.fn()
  }
}));

vi.mock('../lib/firebaseStorage', () => ({
  firebaseStorage: {
    getLoreGlossary: vi.fn()
  }
}));

describe('useChapterTranslation', () => {
  it('should return cached translation if available', async () => {
    vi.mocked(storyStorage.getChapterContent).mockResolvedValue({
      storyId: 's1',
      chapterNumber: 1,
      generatedContent: 'English Text',
      translations: {
        'es': { title: 'es', content: 'Texto en Español', translatedAt: 1234 }
      }
    });

    const { result } = renderHook(() => useChapterTranslation());

    let translated;
    await act(async () => {
      translated = await result.current.translateChapter('s1', 1, 'English Text', 'es');
    });

    expect(translated).toBe('Texto en Español');
    expect(firebaseStorage.getLoreGlossary).not.toHaveBeenCalled();
    global.fetch = vi.fn();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should fetch translation, apply glossary, and save to cache if missing', async () => {
    vi.mocked(storyStorage.getChapterContent).mockResolvedValue({
      storyId: 's1',
      chapterNumber: 1,
      generatedContent: 'English Sword',
    });

    vi.mocked(firebaseStorage.getLoreGlossary).mockResolvedValue([
      { id: '1', novel_id: 's1', source_text: 'Sword', target_text: 'Espada', target_lang: 'es' },
      { id: '2', novel_id: 's1', source_text: 'Sword', target_text: 'Épée', target_lang: 'fr' }
    ]);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ translatedText: 'Espada Inglesa' })
    } as Response);

    const { result } = renderHook(() => useChapterTranslation());

    let translated;
    await act(async () => {
      translated = await result.current.translateChapter('s1', 1, 'English Sword', 'es');
    });

    expect(translated).toBe('Espada Inglesa');
    expect(global.fetch).toHaveBeenCalledWith('/api/translate-chapter', expect.objectContaining({
      body: expect.stringContaining('"targetLang":"es"')
    }));
    // Should filter glossary for 'es' only
    expect(global.fetch).toHaveBeenCalledWith('/api/translate-chapter', expect.objectContaining({
      body: expect.stringContaining('"target_text":"Espada"')
    }));
    expect(global.fetch).not.toHaveBeenCalledWith('/api/translate-chapter', expect.objectContaining({
      body: expect.stringContaining('"target_text":"Épée"')
    }));
    
    // It should save the returned translation to cache
    expect(storyStorage.saveChapterContent).toHaveBeenCalledWith(expect.objectContaining({
      translations: expect.objectContaining({
        'es': expect.objectContaining({ content: 'Espada Inglesa' })
      })
    }));
  });
});
