import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { env } from '../env.js';
import { AppError } from '../http/errors.js';
import { requireAuth, requireRole } from '../auth/middleware.js';

/** Absolute directory where uploaded images live (created on boot). */
export const uploadDir = path.resolve(env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads'));
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = ALLOWED[file.mimetype] ?? path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED[file.mimetype]) cb(null, true);
    else cb(new AppError(400, 'unsupported_type', 'Only JPEG, PNG, WebP or GIF images are allowed'));
  },
});

// Vendors + admins upload offering images.
export const uploadsRouter: Router = Router();
uploadsRouter.use(requireAuth, requireRole('VENDOR', 'ADMIN'));

uploadsRouter.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return next(AppError.badRequest('file_too_large', `Max ${env.MAX_UPLOAD_MB} MB`));
      }
      return next(err);
    }
    if (!req.file) return next(AppError.badRequest('no_file', 'No file uploaded'));
    // Relative, same-origin URL — works behind the single-service deploy and
    // the dev proxy alike.
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});
