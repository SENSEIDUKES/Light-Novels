import express from 'express';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const storageRouter = express.Router();

const getS3Client = () => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Cloudflare R2 configuration is missing');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

// Generate an upload URL (PUT)
storageRouter.post('/api/storage/presign-upload', async (req, res) => {
  try {
    const { fileName, contentType } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    const s3Client = getS3Client();
    const bucketName = process.env.R2_BUCKET_NAME || 'seihouse-storage';

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      ContentType: contentType || 'application/octet-stream',
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    // Also return the public URL if you have a custom domain, 
    // or you can just return the key for fetching later.
    return res.json({ signedUrl, fileName });
  } catch (error) {
    console.error('Failed to generate presigned upload URL:', error);
    res.status(500).json({ error: 'Failed to generate presigned upload URL' });
  }
});

// Generate a download URL (GET) if the bucket isn't public
storageRouter.post('/api/storage/presign-download', async (req, res) => {
  try {
    const { fileName } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    const s3Client = getS3Client();
    const bucketName = process.env.R2_BUCKET_NAME || 'seihouse-storage';

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileName,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return res.json({ signedUrl });
  } catch (error) {
    console.error('Failed to generate presigned download URL:', error);
    res.status(500).json({ error: 'Failed to generate presigned download URL' });
  }
});
