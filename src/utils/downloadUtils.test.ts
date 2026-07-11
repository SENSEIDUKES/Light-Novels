import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleDownload } from './downloadUtils';

describe('handleDownload', () => {
  afterEach(() => vi.restoreAllMocks());

  it('downloads a fetched blob and releases its object URL', async () => {
    const link = { href: '', download: '', target: '', click: vi.fn() } as any;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: vi.fn().mockResolvedValue(new Blob(['chapter'])) }));
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:chapter'), revokeObjectURL: vi.fn() });
    vi.spyOn(document, 'createElement').mockReturnValue(link);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => link);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => link);

    await handleDownload('https://cdn.example/chapter.mp3', 'chapter.mp3');

    expect(fetch).toHaveBeenCalledWith('https://cdn.example/chapter.mp3', { mode: 'cors' });
    expect(link).toMatchObject({ href: 'blob:chapter', download: 'chapter.mp3' });
    expect(link.click).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:chapter');
  });

  it('opens the original URL in a new tab when the CORS download fails', async () => {
    const link = { href: '', download: '', target: '', click: vi.fn() } as any;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    vi.spyOn(document, 'createElement').mockReturnValue(link);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => link);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => link);

    await handleDownload('https://cdn.example/chapter.mp3', 'chapter.mp3');

    expect(link).toMatchObject({
      href: 'https://cdn.example/chapter.mp3', target: '_blank', download: 'chapter.mp3',
    });
    expect(link.click).toHaveBeenCalledOnce();
  });
});
