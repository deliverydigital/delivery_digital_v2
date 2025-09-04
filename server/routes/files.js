import express from 'express';
import path from 'path';
import fs from 'fs';
import { Project, User } from '../models/index.js';
import { isMongoAvailable } from '../config/mongodb.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadGeneral, handleUploadError, deleteFile } from '../middleware/upload.js';
import { validateUUID } from '../middleware/validation.js';
const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// File metadata storage (using localStorage for demo)
const getFileMetadata = () => {
  try {
    const files = localStorage.getItem('fileMetadata');
    return files ? JSON.parse(files) : [];
  } catch (error) {
    console.error('Error reading file metadata:', error);
    return [];
  }
};

const saveFileMetadata = (files) => {
  try {
    localStorage.setItem('fileMetadata', JSON.stringify(files));
  } catch (error) {
    console.error('Error saving file metadata:', error);
  }
};

// Upload files
router.post('/upload', uploadGeneral, handleUploadError, async (req, res) => {
  try {
    const { entity_type, entity_id, is_public } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const uploadedFiles = [];
    const fileMetadata = getFileMetadata();

    for (const file of req.files) {
      const fileRecord = {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        filename: file.filename,
        original_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        file_path: file.path,
        uploaded_by: req.user.id,
        entity_type,
        entity_id,
        is_public: is_public === 'true',
        created_at: new Date()
      };

      fileRecord.url = `${req.protocol}://${req.get('host')}/api/files/${fileRecord.id}`;
      fileMetadata.push(fileRecord);
      uploadedFiles.push(fileRecord);
    }

    saveFileMetadata(fileMetadata);

    res.status(201).json({
      success: true,
      message: 'Files uploaded successfully',
      data: { files: uploadedFiles }
    });

  } catch (error) {
    console.error('Upload files error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload files'
    });
  }
});

// Get file by ID
router.get('/:id', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;

    const fileMetadata = getFileMetadata();
    const file = fileMetadata.find(f => f.id === id);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Check if file is public or user has access
    if (!file.is_public) {
      // Check if user owns the file or is admin
      if (req.user.role !== 'admin' && file.uploaded_by !== req.user.id) {
        // Check if user has access to the entity this file belongs to
        if (file.entity_type === 'project') {
          // Check if MongoDB is available
          if (!isMongoAvailable()) {
            return res.status(503).json({
              success: false,
              error: 'Database service unavailable'
            });
          }

          const project = await Project.findById(file.entity_id);
          if (!project || (req.user.role !== 'admin' && project.client_id.toString() !== req.user.id)) {
            return res.status(403).json({
              success: false,
              error: 'Access denied'
            });
          }
        } else {
          return res.status(403).json({
            success: false,
            error: 'Access denied'
          });
        }
      }
    }

    // Check if file exists on disk
    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({
        success: false,
        error: 'File not found on disk'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', file.file_type);
    res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
    res.setHeader('Content-Length', file.file_size);

    // Stream the file
    const fileStream = fs.createReadStream(file.file_path);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve file'
    });
  }
});

// Download file
router.get('/:id/download', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;

    const fileMetadata = getFileMetadata();
    const file = fileMetadata.find(f => f.id === id);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Check access permissions (same logic as above)
    if (!file.is_public) {
      if (req.user.role !== 'admin' && file.uploaded_by !== req.user.id) {
        if (file.entity_type === 'project') {
          // Check if MongoDB is available
          if (!isMongoAvailable()) {
            return res.status(503).json({
              success: false,
              error: 'Database service unavailable'
            });
          }

          const project = await Project.findById(file.entity_id);
          if (!project || (req.user.role !== 'admin' && project.client_id.toString() !== req.user.id)) {
            return res.status(403).json({
              success: false,
              error: 'Access denied'
            });
          }
        } else {
          return res.status(403).json({
            success: false,
            error: 'Access denied'
          });
        }
      }
    }

    // Check if file exists on disk
    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({
        success: false,
        error: 'File not found on disk'
      });
    }

    // Set download headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
    res.setHeader('Content-Length', file.file_size);

    // Stream the file
    const fileStream = fs.createReadStream(file.file_path);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file'
    });
  }
});

// Get files for an entity
router.get('/entity/:type/:id', validateUUID, async (req, res) => {
  try {
    const { type, id } = req.params;

    // Check access based on entity type
    if (type === 'project') {
      // Check if MongoDB is available
      if (!isMongoAvailable()) {
        return res.status(503).json({
          success: false,
          error: 'Database service unavailable'
        });
      }

      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      if (req.user.role !== 'admin' && project.client_id.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
    }

    const fileMetadata = getFileMetadata();
    const files = fileMetadata.filter(f => f.entity_type === type && f.entity_id === id);

    // Add URLs to files
    const filesWithUrls = files.map(file => ({
      ...file,
      url: `${req.protocol}://${req.get('host')}/api/files/${file.id}`,
      download_url: `${req.protocol}://${req.get('host')}/api/files/${file.id}/download`
    }));

    res.json({
      success: true,
      data: { files: filesWithUrls }
    });

  } catch (error) {
    console.error('Get entity files error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve files'
    });
  }
});

// Delete file
router.delete('/:id', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;

    const fileMetadata = getFileMetadata();
    const fileIndex = fileMetadata.findIndex(f => f.id === id);

    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const file = fileMetadata[fileIndex];

    // Check permissions - only file owner or admin can delete
    if (req.user.role !== 'admin' && file.uploaded_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Remove from metadata
    fileMetadata.splice(fileIndex, 1);
    saveFileMetadata(fileMetadata);

    // Delete file from disk
    await deleteFile(file.file_path);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file'
    });
  }
});

// Get file metadata
router.get('/:id/metadata', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;

    const fileMetadata = getFileMetadata();
    const file = fileMetadata.find(f => f.id === id);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Check access permissions
    if (!file.is_public) {
      if (req.user.role !== 'admin' && file.uploaded_by !== req.user.id) {
        if (file.entity_type === 'project') {
          // Check if MongoDB is available
          if (!isMongoAvailable()) {
            return res.status(503).json({
              success: false,
              error: 'Database service unavailable'
            });
          }

          const project = await Project.findById(file.entity_id);
          if (!project || (req.user.role !== 'admin' && project.client_id.toString() !== req.user.id)) {
            return res.status(403).json({
              success: false,
              error: 'Access denied'
            });
          }
        } else {
          return res.status(403).json({
            success: false,
            error: 'Access denied'
          });
        }
      }
    }

    // Remove file_path from response for security
    const { file_path, ...safeFile } = file;

    safeFile.url = `${req.protocol}://${req.get('host')}/api/files/${file.id}`;
    safeFile.download_url = `${req.protocol}://${req.get('host')}/api/files/${file.id}/download`;

    res.json({
      success: true,
      data: { file: safeFile }
    });

  } catch (error) {
    console.error('Get file metadata error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve file metadata'
    });
  }
});

export default router;