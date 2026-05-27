const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
const maxFileSize = 2 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeOriginalName}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  cb(new Error('Недозволений тип файлу. Дозволено: jpg, png, pdf'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxFileSize }
});

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Файл не передано' });
  }

  res.status(201).json({
    message: 'Файл успішно завантажено',
    file: {
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: `/uploads/${req.file.filename}`
    }
  });
});

router.post('/upload-multiple', upload.array('files', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'Файли не передано' });
  }

  res.status(201).json({
    message: 'Файли успішно завантажено',
    files: req.files.map((file) => ({
      originalName: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      path: `/uploads/${file.filename}`
    }))
  });
});

module.exports = router;
