import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleDownload } from './downloadUtils';

describe('handleDownload', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('downloads a fetched blob and releases its object URL', async () => {
    const link = { href: '', download: '', target: '', click: vi.fn() } as any;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: vi.fn().mockResolvedValue(new Blob(['chapter'])) }));
    const OriginalURL = globalThis.URL;
    vi.stubGlobal('URL', class extends OriginalURL {
      static createObjectURL = vi.fn(() => 'blob:chapter');
      static revokeObjectURL = vi.fn();
    });
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


  it('allows relative download URLs', async () => {
    const link = { href: '', download: '', target: '', click: vi.fn() } as any;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    vi.spyOn(document, 'createElement').mockReturnValue(link);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => link);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => link);

    await handleDownload('/downloads/chapter.mp3', 'chapter.mp3');

    expect(fetch).toHaveBeenCalledWith('/downloads/chapter.mp3', { mode: 'cors' });
    expect(link.href).toBe('/downloads/chapter.mp3');
    expect(link.click).toHaveBeenCalledOnce();
  });

  it('blocks downloads from internal/local network addresses', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn());

    await handleDownload('http://169.254.169.254/latest', 'meta.txt');
    expect(consoleError).toHaveBeenCalledWith('Security validation failed or invalid URL', expect.any(Error));
    expect(fetch).not.toHaveBeenCalled();

    await handleDownload('http://localhost:8080/data', 'data.json');
    expect(consoleError).toHaveBeenCalledWith('Security validation failed or invalid URL', expect.any(Error));
    expect(fetch).not.toHaveBeenCalled();

    await handleDownload('http://127.0.0.1/admin', 'admin.html');
    expect(consoleError).toHaveBeenCalledWith('Security validation failed or invalid URL', expect.any(Error));
    expect(fetch).not.toHaveBeenCalled();

    await handleDownload('http://[::1]/admin', 'admin.html');
    expect(consoleError).toHaveBeenCalledWith('Security validation failed or invalid URL', expect.any(Error));
    expect(fetch).not.toHaveBeenCalled();
  });

});
