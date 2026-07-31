export const handleDownload = async (url: string, filename: string) => {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    if (!['http:', 'https:', 'blob:', 'data:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid URL protocol for download');
    }

    if (['http:', 'https:'].includes(parsedUrl.protocol)) {
      if (parsedUrl.origin !== window.location.origin) {
        const hostname = parsedUrl.hostname.toLowerCase();
        const isInternal =
          hostname === 'localhost' ||
          hostname === '[::1]' ||
          hostname.startsWith('127.') ||
          hostname.startsWith('10.') ||
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('169.254.') ||
          hostname.endsWith('.localhost') ||
          hostname.endsWith('.local') ||
          hostname.endsWith('.internal');

        if (isInternal) {
          throw new Error('External downloads from internal network hosts are not permitted');
        }
      }
    }
  } catch (e) {
    console.error('Security validation failed or invalid URL', e);
    return;
  }

  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('CORS or Network error');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (e) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
