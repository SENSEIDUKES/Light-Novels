import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { config as loadEnvironment } from 'dotenv';
import { createR2Client, loadR2Config } from '../src/server/media/r2ObjectStore';

loadEnvironment({ quiet: true });

const PROVISION_OPT_IN = 'I_UNDERSTAND_THIS_CREATES_OR_UPDATES_PRODUCTION_R2';

function isMissingBucket(error: unknown): boolean {
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return candidate.name === 'NotFound'
    || candidate.name === 'NoSuchBucket'
    || candidate.$metadata?.httpStatusCode === 404;
}

async function main(): Promise<void> {
  if (process.env.FOUNDATION_PROVISION_R2 !== PROVISION_OPT_IN) {
    throw new Error(`R2 provisioning is disabled. Set FOUNDATION_PROVISION_R2=${PROVISION_OPT_IN} to opt in.`);
  }

  const config = loadR2Config();
  const client = createR2Client(config);
  let created = false;
  try {
    await client.send(new HeadBucketCommand({ Bucket: config.privateBucket }));
  } catch (error) {
    if (!isMissingBucket(error)) throw error;
    await client.send(new CreateBucketCommand({ Bucket: config.privateBucket }));
    created = true;
  }

  // CORS does not grant object access. The private bucket still requires a
  // valid signed URL, while this rule lets a browser use that signed URL from
  // the current or future web application origin.
  await client.send(new PutBucketCorsCommand({
    Bucket: config.privateBucket,
    CORSConfiguration: {
      CORSRules: [{
        AllowedHeaders: ['*'],
        AllowedMethods: ['GET', 'HEAD'],
        AllowedOrigins: ['*'],
        ExposeHeaders: ['Content-Length', 'Content-Type', 'ETag'],
        MaxAgeSeconds: 3_600,
      }],
    },
  }));

  process.stdout.write(`${JSON.stringify({
    ok: true,
    privateBucketCreated: created,
    privateBucketCorsConfigured: true,
    publicBucketSeparated: Boolean(config.publicBucket && config.publicBucket !== config.privateBucket),
  }, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`R2 foundation provisioning failed: ${message}\n`);
  process.exitCode = 1;
});
