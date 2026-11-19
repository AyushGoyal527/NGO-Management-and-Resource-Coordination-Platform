const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const ApiError = require('../utils/ApiError');

const ALLOWED = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf',
};
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// Disk storage today. Swap `storage` for a Cloudinary/S3 engine later; controllers only read req.file(s).
exports.createUpload = (subfolder = 'general', { imagesOnly = false } = {}) => {
  const dir = path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads', subfolder);
  fs.mkdirSync(dir, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination: dir,
      filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + ALLOWED[file.mimetype]),
    }),
    limits: { fileSize: MAX_SIZE, files: 5 },
    fileFilter: (req, file, cb) => {
      const ok = ALLOWED[file.mimetype] && (!imagesOnly || file.mimetype.startsWith('image/'));
      cb(ok ? null : new ApiError(400, imagesOnly ? 'Only JPG, PNG or WEBP images are allowed' : 'Only JPG, PNG, WEBP or PDF files are allowed'), ok);
    },
  });
};
