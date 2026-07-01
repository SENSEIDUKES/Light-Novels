// Frontend helper for Cloudflare R2 uploads via our Express backend
export const uploadFileToR2 = async (file: File | Blob, fileName: string, contentType: string) => {
  try {
    // 1. Get presigned upload URL from our backend
    const presignRes = await fetch('/api/storage/presign-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileName, contentType }),
    });

    if (!presignRes.ok) {
      const err = await presignRes.json();
      throw new Error(err.error || 'Failed to get presigned URL');
    }

    const { signedUrl } = await presignRes.json();

    // 2. Upload file directly to Cloudflare R2
    const uploadRes = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error('Failed to upload file to R2');
    }

    // 3. Return the storage reference (fileName) 
    // This fileName can be stored in Supabase profiles/stories for later retrieval
    return fileName;
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw error;
  }
};

export const getDownloadUrlFromR2 = async (fileName: string) => {
  try {
    const presignRes = await fetch('/api/storage/presign-download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileName }),
    });

    if (!presignRes.ok) {
      throw new Error('Failed to get download URL');
    }

    const { signedUrl } = await presignRes.json();
    return signedUrl;
  } catch (error) {
    console.error('Error getting download URL from R2:', error);
    throw error;
  }
};
