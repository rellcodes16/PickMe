const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinaryConfig')

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'pickme_profile_pictures',
        allowedFormats: ['jpeg', 'jpg', 'png'],
    },
});

const uploadMiddleware = multer({ storage }).single('profilePicture');

module.exports = uploadMiddleware;
