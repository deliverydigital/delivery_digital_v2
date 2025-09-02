import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    // Organize files by type
    if (file.fieldname === 'project_attachments') {
      uploadPath += 'projects/';
    } else if (file.fieldname === 'task_attachments') {
      uploadPath += 'tasks/';
    } else if (file.fieldname === 'message_attachments') {
      uploadPath += 'messages/';
    } else if (file.fieldname === 'training_materials') {
      uploadPath += 'training/';
    } else if (file.fieldname === 'profile_image') {
      uploadPath += 'profiles/';
    } else {
      uploadPath += 'general/';
    }
    
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    const filename = `${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = {
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true,
    'application/pdf': true,
    'application/msword': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
    'application/vnd.ms-excel': true,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
    'application/vnd.ms-powerpoint': true,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': true,
    'text/plain': true,
    'text/csv': true,
    'application/zip': true,
    'application/x-zip-compressed': true,
    'application/json': true
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files per request
  }
});

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Maximum is 10 files per request.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected file field.'
      });
    }
  }
  
  if (error.message.includes('File type')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  
  next(error);
};

// Helper function to save file metadata to database
const saveFileMetadata = async (file, entityType, entityId, uploadedBy) => {
  try {
    const result = await query(
      `INSERT INTO file_uploads 
       (filename, original_name, file_type, file_size, file_path, uploaded_by, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        file.filename,
        file.originalname,
        file.mimetype,
        file.size,
        file.path,
        uploadedBy,
        entityType,
        entityId
      ]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error saving file metadata:', error);
    throw error;
  }
};

// Helper function to delete file
const deleteFile = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

// Helper function to get file URL
const getFileUrl = (req, filePath) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/${filePath.replace(/\\/g, '/')}`;
};

// Middleware for different upload types
const uploadProjectFiles = upload.array('project_attachments', 10);
const uploadTaskFiles = upload.array('task_attachments', 5);
const uploadMessageFiles = upload.array('message_attachments', 5);
const uploadTrainingMaterials = upload.array('training_materials', 10);
const uploadProfileImage = upload.single('profile_image');
const uploadGeneral = upload.array('files', 10);

export {
  upload,
  handleUploadError,
  saveFileMetadata,
  deleteFile,
  getFileUrl,
  uploadProjectFiles,
  uploadTaskFiles,
  uploadMessageFiles,
  uploadTrainingMaterials,
  uploadProfileImage,
  uploadGeneral
};