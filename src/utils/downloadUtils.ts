export const handleDownload = async (url: string, filename: string) => {
  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:', 'blob:', 'data:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid URL protocol for download');
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
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
