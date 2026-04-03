const multer = require('multer');

const ALLOWED_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo

// PDF magic bytes: %PDF (0x25504446)
// DOCX magic bytes: PK (0x504B0304) — ZIP format
// DOC magic bytes: D0 CF 11 E0 — OLE2 format
const MAGIC_BYTES = {
  pdf: Buffer.from([0x25, 0x50, 0x44, 0x46]),
  zip: Buffer.from([0x50, 0x4B, 0x03, 0x04]),
  ole2: Buffer.from([0xD0, 0xCF, 0x11, 0xE0]),
};

function validateFileContent(buffer) {
  if (buffer.length < 4) return false;
  const header = buffer.subarray(0, 4);
  return (
    header.equals(MAGIC_BYTES.pdf) ||
    header.equals(MAGIC_BYTES.zip) ||
    header.equals(MAGIC_BYTES.ole2)
  );
}

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(new Error('Format de fichier non accepté. PDF ou Word uniquement.'));
    }
    cb(null, true);
  },
});

module.exports = { upload, validateFileContent };
