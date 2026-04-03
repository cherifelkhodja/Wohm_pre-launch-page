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

async function getPresignedCVUrl(key) {
  const s3 = getS3Client();
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });
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
