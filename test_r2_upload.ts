import { uploadFileToR2, getDownloadUrlFromR2 } from './src/lib/r2';
import fetch from 'node-fetch';

(global as any).fetch = fetch;

async function testR2() {
  try {
    const textData = "Hello from R2 test";
    const blob = new Blob([textData], { type: 'text/plain' });
    const fileName = `test_upload_${Date.now()}.txt`;
    
    console.log('Requesting upload...');
    // We're hitting the dev server which is at localhost:3000
    const presignRes = await fetch('http://localhost:3000/api/storage/presign-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileName, contentType: 'text/plain' }),
    });

    if (!presignRes.ok) throw new Error('Upload presign failed: ' + await presignRes.text());
    
    const { signedUrl } = await presignRes.json() as any;
    console.log('Got signed upload URL:', signedUrl.substring(0, 50) + '...');

    const uploadRes = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: textData,
    });

    if (!uploadRes.ok) throw new Error('Upload failed: ' + await uploadRes.text());
    console.log('Upload successful!');

    const presignDown = await fetch('http://localhost:3000/api/storage/presign-download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileName }),
    });

    if (!presignDown.ok) throw new Error('Download presign failed');
    
    const { signedUrl: downloadUrl } = await presignDown.json() as any;
    console.log('Got signed download URL:', downloadUrl.substring(0, 50) + '...');

    const downloadRes = await fetch(downloadUrl);
    const downloadedText = await downloadRes.text();
    console.log('Downloaded text matches:', downloadedText === textData);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testR2();
