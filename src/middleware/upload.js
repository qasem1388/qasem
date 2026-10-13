'use strict';
/** استقبال الملفات في الذاكرة مع حد أقصى للحجم، ثم التحقق منها في خدمة التخزين قبل الحفظ */
const multer = require('multer');
const config = require('../config');

const maxBytes = Math.max(config.uploads.maxImageMB, config.uploads.maxPdfMB) * 1024 * 1024;

function uploader({ maxFiles = 20 } = {}) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: maxFiles, fields: 50, fieldSize: 100 * 1024 },
  });
}

module.exports = { uploader, maxBytes };
