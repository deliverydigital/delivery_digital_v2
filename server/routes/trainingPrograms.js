import express from 'express';
import path from 'path';
import fs from 'fs';
import {TrainingDocument, TrainingProgram, User} from '../models/index.js';
import { isMongoAvailable } from '../config/mongodb.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadTrainingMaterials, handleUploadError, deleteFile } from '../middleware/upload.js';
import { validateStringId, validatePagination } from '../middleware/validation.js';

const router = express.Router();

// Public routes (no authentication required)
// Get documents for a training program (public)
router.get('/:programId/documents', async (req, res) => {
  try {
    const { programId } = req.params;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const program = await TrainingProgram.findOne({ program_id: programId })
      .populate('documents.uploaded_by', 'name email');

    if (!program) {
      return res.status(404).json({
        success: false,
        error: 'Training program not found'
      });
    }

    // Filter public documents and add download URLs
    const publicDocuments = program.documents
      .filter(doc => doc.is_public)
      .map(doc => ({
        id: doc._id,
        title: doc.title,
        description: doc.description,
        document_type: doc.document_type,
        file_size: doc.file_size,
        download_count: doc.download_count,
        uploaded_at: doc.uploaded_at,
        download_url: `${req.protocol}://${req.get('host')}/api/training-programs/${programId}/documents/${doc._id}/download`
      }));

    res.json({
      success: true,
      data: { documents: publicDocuments }
    });

  } catch (error) {
    console.error('Get training program documents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documents'
    });
  }
});

// Download training program document (public)
router.get('/:programId/documents/:documentId/download', async (req, res) => {
  try {
    const { programId, documentId } = req.params;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    console.log(await TrainingDocument.find());

    const document = await TrainingDocument.findOne({ program_id: programId , _id : documentId});
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    if (!document.is_public) {
      return res.status(403).json({
        success: false,
        error: 'Document not available for download'
      });
    }

    // Check if file exists on disk
    if (!fs.existsSync(document.file_path)) {
      return res.status(404).json({
        success: false,
        error: 'File not found on disk'
      });
    }

    // Increment download count
    await document.incrementDownloadCount(documentId);

    // Set download headers
    res.setHeader('Content-Type', document.file_type);
    res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`);
    res.setHeader('Content-Length', document.file_size);

    // Stream the file
    const fileStream = fs.createReadStream(document.file_path);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download training program document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download document'
    });
  }
});

// Get all training programs (public)
router.get('/', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search, active_only = 'true' } = req.query;
    const skip = (page - 1) * limit;

// Create new training program (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const {
      program_id,
      title,
      description,
      category,
      duration_hours,
      price,
      level,
      max_participants,
      prerequisites,
      objectives,
      methods,
      evaluation_methods,
      accessibility_info,
      access_delay,
      modules
    } = req.body;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Check if program_id already exists
    const existingProgram = await TrainingProgram.findOne({ program_id });
    if (existingProgram) {
      return res.status(400).json({
        success: false,
        error: 'Program ID already exists'
      });
    }

    const programData = {
      program_id,
      title,
      description,
      category,
      duration_hours: parseInt(duration_hours),
      price: parseFloat(price),
      level: level || 'beginner',
      max_participants: parseInt(max_participants) || 12,
      prerequisites,
      objectives: objectives ? (Array.isArray(objectives) ? objectives : objectives.split(',').map(o => o.trim())) : [],
      methods: methods ? (Array.isArray(methods) ? methods : methods.split(',').map(m => m.trim())) : [],
      evaluation_methods: evaluation_methods ? (Array.isArray(evaluation_methods) ? evaluation_methods : evaluation_methods.split(',').map(e => e.trim())) : [],
      accessibility_info,
      access_delay,
      modules: modules ? (typeof modules === 'string' ? JSON.parse(modules) : modules) : [],
      documents: []
    };

    const program = new TrainingProgram(programData);
    await program.save();

    res.status(201).json({
      success: true,
      message: 'Training program created successfully',
      data: { program }
    });

  } catch (error) {
    console.error('Create training program error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create training program'
    });
  }
});

// Upload document to training program (admin only)
router.post('/:programId/documents', authenticate, authorize('admin'), uploadTrainingMaterials, handleUploadError, async (req, res) => {
  try {
    const { programId } = req.params;
    const { title, description, document_type = 'program' } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const program = await TrainingProgram.findOne({ program_id: programId });
    if (!program) {
      return res.status(404).json({
        success: false,
        error: 'Training program not found'
      });
    }

    const uploadedDocuments = [];

    for (const file of req.files) {
      // Only allow PDF files
      if (file.mimetype !== 'application/pdf') {
        continue;
      }

      const documentData = {
        title: title || file.originalname,
        description,
        filename: file.filename,
        original_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        file_path: file.path,
        document_type,
        is_public: true,
        uploaded_by: req.user.id,
        uploaded_at: new Date()
      };

      await program.addDocument(documentData);
      uploadedDocuments.push(documentData);
    }

    // Reload program to get updated documents with IDs
    const updatedProgram = await TrainingProgram.findOne({ program_id: programId });

    res.status(201).json({
      success: true,
      message: 'Documents uploaded successfully',
      data: {
        program: updatedProgram,
        uploaded_documents: uploadedDocuments.length
      }
    });

  } catch (error) {
    console.error('Upload training program documents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload documents'
    });
  }
});

// Download training program document (public)
router.get('/:programId/documents/:documentId/download', async (req, res) => {
  try {
    const { programId, documentId } = req.params;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    console.log(await TrainingDocument.find());

    const document = await TrainingDocument.findOne({ program_id: programId , _id : documentId});
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    if (!document.is_public) {
      return res.status(403).json({
        success: false,
        error: 'Document not available for download'
      });
    }

    // Check if file exists on disk
    if (!fs.existsSync(document.file_path)) {
      return res.status(404).json({
        success: false,
        error: 'File not found on disk'
      });
    }

    // Increment download count
    await document.incrementDownloadCount(documentId);

    // Set download headers
    res.setHeader('Content-Type', document.file_type);
    res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`);
    res.setHeader('Content-Length', document.file_size);

    // Stream the file
    const fileStream = fs.createReadStream(document.file_path);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download training program document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download document'
    });
  }
});

// Get documents for a training program (public)
router.get('/:programId/documents', async (req, res) => {
  try {
    const { programId } = req.params;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const program = await TrainingProgram.findOne({ program_id: programId })
      .populate('documents.uploaded_by', 'name email');

    if (!program) {
      return res.status(404).json({
        success: false,
        error: 'Training program not found'
      });
    }

    // Filter public documents and add download URLs
    const publicDocuments = program.documents
      .filter(doc => doc.is_public)
      .map(doc => ({
        id: doc._id,
        title: doc.title,
        description: doc.description,
        document_type: doc.document_type,
        file_size: doc.file_size,
        download_count: doc.download_count,
        uploaded_at: doc.uploaded_at,
        download_url: `${req.protocol}://${req.get('host')}/api/training-programs/${programId}/documents/${doc._id}/download`
      }));

    res.json({
      success: true,
      data: { documents: publicDocuments }
    });

  } catch (error) {
    console.error('Get training program documents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documents'
    });
  }
});

// Update training program (admin only)
router.put('/:programId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { programId } = req.params;
    const updates = req.body;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const program = await TrainingProgram.findOne({ program_id: programId });
    if (!program) {
      return res.status(404).json({
        success: false,
        error: 'Training program not found'
      });
    }

    // Update allowed fields
    const allowedFields = [
      'title', 'description', 'category', 'duration_hours', 'price', 'level',
      'max_participants', 'prerequisites', 'objectives', 'methods', 
      'evaluation_methods', 'accessibility_info', 'access_delay', 'is_active', 'modules'
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        if (key === 'objectives' || key === 'methods' || key === 'evaluation_methods') {
          program[key] = Array.isArray(value) ? value : value.split(',').map(item => item.trim());
        } else if (key === 'modules') {
          program[key] = typeof value === 'string' ? JSON.parse(value) : value;
        } else {
          program[key] = value;
        }
      }
    }

    await program.save();

    res.json({
      success: true,
      message: 'Training program updated successfully',
      data: { program }
    });

  } catch (error) {
    console.error('Update training program error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update training program'
    });
  }
});

// Delete training program document (admin only)
router.delete('/:programId/documents/:documentId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { programId, documentId } = req.params;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const program = await TrainingProgram.findOne({ program_id: programId });
    if (!program) {
      return res.status(404).json({
        success: false,
        error: 'Training program not found'
      });
    }

    const document = program.documents.id(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Delete file from disk
    if (fs.existsSync(document.file_path)) {
      await deleteFile(document.file_path);
    }

    // Remove document from program
    await program.removeDocument(documentId);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete training program document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete document'
    });
  }
});

// Delete training program (admin only)
router.delete('/:programId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { programId } = req.params;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const program = await TrainingProgram.findOne({ program_id: programId });
    if (!program) {
      return res.status(404).json({
        success: false,
        error: 'Training program not found'
      });
    }

    // Delete all associated files
    for (const document of program.documents) {
      if (fs.existsSync(document.file_path)) {
        await deleteFile(document.file_path);
      }
    }

    // Delete program from database
    await TrainingProgram.deleteOne({ program_id: programId });

    res.json({
      success: true,
      message: 'Training program deleted successfully'
    });

  } catch (error) {
    console.error('Delete training program error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete training program'
    });
  }
});

// Get training program statistics (admin only)
router.get('/stats/overview', authenticate, authorize('admin'), async (req, res) => {
  try {
    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const programs = await TrainingProgram.find();

    const stats = {
      total_programs: programs.length,
      active_programs: programs.filter(p => p.is_active).length,
      total_documents: programs.reduce((sum, p) => sum + p.documents.length, 0),
      total_downloads: programs.reduce((sum, p) => 
        sum + p.documents.reduce((docSum, doc) => docSum + doc.download_count, 0), 0),
      programs_by_category: {},
      popular_programs: programs
        .map(p => ({
          program_id: p.program_id,
          title: p.title,
          total_downloads: p.documents.reduce((sum, doc) => sum + doc.download_count, 0)
        }))
        .sort((a, b) => b.total_downloads - a.total_downloads)
        .slice(0, 5),
      average_price: programs.length > 0 
        ? programs.reduce((sum, p) => sum + p.price, 0) / programs.length 
        : 0
    };

    // Calculate category distribution
    programs.forEach(program => {
      stats.programs_by_category[program.category] = (stats.programs_by_category[program.category] || 0) + 1;
    });

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    console.error('Get training program stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch training program statistics'
    });
  }
});

export default router;