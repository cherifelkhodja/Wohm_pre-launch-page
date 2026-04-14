const { S3Client, PutObjectCommand, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

let client;

function getS3Client() {
  if (!client) {
    client = new S3Client({
      region: process.env.S3_REGION || 'eu-west-3',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

function getBucket() {
  return process.env.S3_BUCKET || 'wohm-cv';
}

async function uploadCV(buffer, key, contentType) {
  const s3 = getS3Client();
  await s3.send(new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return key;
}

async function getPresignedCVUrl(key, options = {}) {
  const s3 = getS3Client();
  const params = {
    Bucket: getBucket(),
    Key: key,
  };
  if (options.disposition) {
    const original = options.filename || 'cv';
    // RFC 5987: ASCII-only fallback + UTF-8 encoded filename*
    const asciiFallback = original.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '');
    const encoded = encodeURIComponent(original);
    params.ResponseContentDisposition =
      `${options.disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
  }
  const command = new GetObjectCommand(params);
  return getSignedUrl(s3, command, { expiresIn: 900 }); // 15 minutes
}

async function moveCV(oldKey, newKey) {
  const s3 = getS3Client();
  const bucket = getBucket();
  await s3.send(new CopyObjectCommand({
    Bucket: bucket,
    CopySource: encodeURI(`${bucket}/${oldKey}`),
    Key: newKey,
  }));
  await s3.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: oldKey,
  }));
  return newKey;
}

module.exports = { uploadCV, getPresignedCVUrl, moveCV };
