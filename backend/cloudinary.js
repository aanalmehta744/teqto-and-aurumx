const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function createUpload(folder) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `teqto/${folder}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'],
      resource_type: 'auto',
    },
  });
  return multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
}

module.exports = { cloudinary, createUpload };
