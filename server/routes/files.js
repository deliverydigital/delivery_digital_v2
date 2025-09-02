import express from 'express';
import path from 'path';
import fs from 'fs';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadGeneral, handleUploadError, deleteFile } from '../middleware/upload.js';
import { validateUUID } from '../middleware/validation.js';
const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

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

    for (const file of req.files) {
      const result = await query(
        `INSERT INTO file_uploads 
         (filename, original_name, file_type, file_size, file_path, uploaded_by, entity_type, entity_id, is_public)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          file.filename,
          file.originalname,
          file.mimetype,
          file.size,
          file.path,
          req.user.id,
          entity_type,
          entity_id,
          is_public === 'true'
        ]
      );

      const fileRecord = result.rows[0];
      fileRecord.url = `${req.protocol}://${req.get('host')}/api/files/${fileRecord.id}`;
      uploadedFiles.push(fileRecord);
    }

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

    const fileResult = await query(
      'SELECT * FROM file_uploads WHERE id = $1',
      [id]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const file = fileResult.rows[0];

    // Check if file is public or user has access
    if (!file.is_public) {
      // Check if user owns the file or is admin
      if (req.user.role !== 'admin' && file.uploaded_by !== req.user.id) {
        // Check if user has access to the entity this file belongs to
        if (file.entity_type === 'project') {
          const projectCheck = await query(
            'SELECT client_id FROM projects WHERE id = $1',
            [file.entity_id]
          );
          
          if (projectCheck.rows.length === 0 || 
              (req.user.role !== 'admin' && projectCheck.rows[0].client_id !== req.user.id)) {
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

    const fileResult = await query(
      'SELECT * FROM file_uploads WHERE id = $1',
      [id]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const file = fileResult.rows[0];

    // Check access permissions (same logic as above)
    if (!file.is_public) {
      if (req.user.role !== 'admin' && file.uploaded_by !== req.user.id) {
        if (file.entity_type === 'project') {
          const projectCheck = await query(
            'SELECT client_id FROM projects WHERE id = $1',
            [file.entity_id]
          );
          
          if (projectCheck.rows.length === 0 || 
              (req.user.role !== 'admin' && projectCheck.rows[0].client_id !== req.user.id)) {
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
      const projectCheck = await query(
        'SELECT client_id FROM projects WHERE id = $1',
        [id]
      );
      
      if (projectCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      if (req.user.role !== 'admin' && projectCheck.rows[0].client_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
    }

    const filesResult = await query(
      `SELECT 
        f.*,
        u.name as uploaded_by_name
       FROM file_uploads f
       LEFT JOIN users u ON f.uploaded_by = u.id
       WHERE f.entity_type = $1 AND f.entity_id = $2
       ORDER BY f.created_at DESC`,
      [type, id]
    );

    const files = filesResult.rows.map(file => ({
      ...file,
      url: `${req.protocol}://${req.get('host')}/api/files/${file.id}`,
      download_url: `${req.protocol}://${req.get('host')}/api/files/${file.id}/download`
    }));

    res.json({
      success: true,
      data: { files }
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

    const fileResult = await query(
      'SELECT * FROM file_uploads WHERE id = $1',
      [id]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const file = fileResult.rows[0];

    // Check permissions - only file owner or admin can delete
    if (req.user.role !== 'admin' && file.uploaded_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Delete file from database
    await query('DELETE FROM file_uploads WHERE id = $1', [id]);

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

    const fileResult = await query(
      `SELECT 
        f.*,
        u.name as uploaded_by_name
       FROM file_uploads f
       LEFT JOIN users u ON f.uploaded_by = u.id
       WHERE f.id = $1`,
      [id]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const file = fileResult.rows[0];

    // Check access permissions
    if (!file.is_public) {
      if (req.user.role !== 'admin' && file.uploaded_by !== req.user.id) {
        if (file.entity_type === 'project') {
          const projectCheck = await query(
            'SELECT client_id FROM projects WHERE id = $1',
            [file.entity_id]
          );
          
          if (projectCheck.rows.length === 0 || 
              (req.user.role !== 'admin' && projectCheck.rows[0].client_id !== req.user.id)) {
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
    delete file.file_path;

    file.url = `${req.protocol}://${req.get('host')}/api/files/${file.id}`;
    file.download_url = `${req.protocol}://${req.get('host')}/api/files/${file.id}/download`;

    res.json({
      success: true,
      data: { file }
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