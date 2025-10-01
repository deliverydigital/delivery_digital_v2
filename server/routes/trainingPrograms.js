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
    const { page = 1, limit = 50, category, search, active_only } = req.query;
    const skip = (page - 1) * limit;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      // Return fallback data when MongoDB is not available
      const fallbackPrograms = [
        { id: 'wordpress', name: 'WordPress' },
        { id: 'photoshop', name: 'Photoshop' },
        { id: 'canva', name: 'Canva' },
        { id: 'excel', name: 'Excel' },
        { id: 'dev-web-mobile', name: 'Développeur Web et Web Mobile' },
        { id: 'reflex-english-1', name: 'Reflex English 1' },
        { id: 'reflex-english-2', name: 'Reflex English 2' },
        { id: 'reflex-english-3', name: 'Reflex English 3' },
        { id: 'hygiene-security', name: 'Hygiène, Sécurité et Développement Durable' },
        { id: 'hygiene-security-afest', name: 'Hygiène, Sécurité et Développement Durable - AFEST' },
        { id: 'conduite-securitaire', name: 'Conduite Sécuritaire' },
        { id: 'autocad-sketchup-revit', name: 'AutoCAD, SketchUp, et Revit' },
        { id: 'reflex-espagnol-1', name: 'Reflex Espagnol Niveau 1' },
        { id: 'reflex-espagnol-2', name: 'Reflex Espagnol Niveau 2' },
        { id: 'reflex-espagnol-3', name: 'Reflex Espagnol Niveau 3' },
        { id: 'management-complet', name: 'Management Parcours Complet' },
        { id: 'vente-omnicanal', name: 'Techniques de Vente Omnicanal' },
        { id: 'nutrition', name: 'Nutrition' }
      ];
      
      return res.json({
        success: true,
        data: {
          programs: fallbackPrograms,
          pagination: {
            current_page: 1,
            total_pages: 1,
            total_items: fallbackPrograms.length,
            items_per_page: fallbackPrograms.length
          }
        }
      });
    }

    // Build query
    const query = {};
    
    // Only filter by active status if explicitly requested
    // For admin users, show all programs by default unless active_only is specifically set to 'true'
    if (active_only === 'true') {
      query.is_active = true;
    } else if (active_only === 'false') {
      query.is_active = false;
    }
    // If active_only is not specified or is 'all', don't filter by is_active

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('📊 Training programs query:', query);
    console.log('📊 Query parameters:', { page, limit, category, search, active_only });
    const programs = await TrainingProgram.find(query)
      .select('program_id title modules description category duration_hours price level max_participants is_featured opco_eligible cpf_eligible certification_type')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ is_featured: -1, title: 1 });

    console.log('📊 Found programs:', programs.length);
    const total = await TrainingProgram.countDocuments(query);

    res.json({
      success: true,
      data: {
        programs: programs.map(program => ({
          id: program.program_id,
          name: program.title,
          title: program.title,
          description: program.description,
          category: program.category,
          duration_hours: program.duration_hours,
          price: program.price,
          level: program.level,
          max_participants: program.max_participants,
          is_featured: program.is_featured,
          is_active: program.is_active,
          opco_eligible: program.opco_eligible,
          cpf_eligible: program.cpf_eligible,
          certification_type: program.certification_type,
          modules : program.modules
        })),
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get training programs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch training programs'
    });
  }
});

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
      modules,
      is_active,
      is_featured,
      opco_eligible,
      cpf_eligible,
      certification_type,
      certification_provider
    } = req.body;

    console.log('📊 Received request body:', req.body);
    console.log('📊 Individual fields:', {
      program_id: program_id,
      title: title,
      description: description,
      category: category,
      duration_hours: duration_hours,
      price: price,
      level: level,
      max_participants: max_participants,
      prerequisites: prerequisites,
      objectives: objectives,
      methods: methods,
      evaluation_methods: evaluation_methods,
      accessibility_info: accessibility_info,
      access_delay: access_delay,
      modules: modules,
      is_active: is_active,
      is_featured: is_featured,
      opco_eligible: opco_eligible,
      cpf_eligible: cpf_eligible,
      certification_type: certification_type,
      certification_provider: certification_provider
    });

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

    // Validate required fields
    if (!program_id || !title || !description) {
      console.error('❌ Missing required fields:', { program_id, title, description });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: program_id, title, and description are required'
      });
    }

    if (!duration_hours || duration_hours <= 0) {
      console.error('❌ Invalid duration_hours:', duration_hours);
      return res.status(400).json({
        success: false,
        error: 'Duration hours must be a positive number'
      });
    }

    if (!price || price < 0) {
      console.error('❌ Invalid price:', price);
      return res.status(400).json({
        success: false,
        error: 'Price must be a positive number'
      });
    }

    // Process array fields properly
    const processedObjectives = objectives ? 
      (Array.isArray(objectives) ? objectives : objectives.split(',').map(o => o.trim()).filter(o => o)) : [];
    const processedMethods = methods ? 
      (Array.isArray(methods) ? methods : methods.split(',').map(m => m.trim()).filter(m => m)) : [];
    const processedEvaluationMethods = evaluation_methods ? 
      (Array.isArray(evaluation_methods) ? evaluation_methods : evaluation_methods.split(',').map(e => e.trim()).filter(e => e)) : [];
    const processedModules = modules ? 
      (typeof modules === 'string' ? JSON.parse(modules) : modules) : [];

    console.log('📊 Processed arrays:', {
      processedObjectives,
      processedMethods,
      processedEvaluationMethods,
      processedModules
    });

    const programData = {
      program_id,
      title,
      description,
      category,
      duration_hours: parseInt(duration_hours) || 0,
      price: parseFloat(price) || 0,
      level: level || 'beginner',
      max_participants: parseInt(max_participants) || 12,
      prerequisites,
      objectives: processedObjectives,
      methods: processedMethods,
      evaluation_methods: processedEvaluationMethods,
      accessibility_info,
      access_delay,
      modules: processedModules,
      documents: [],
      is_active: is_active !== undefined ? is_active : true,
      is_featured: is_featured !== undefined ? is_featured : false,
      opco_eligible: opco_eligible !== undefined ? opco_eligible : true,
      cpf_eligible: cpf_eligible !== undefined ? cpf_eligible : false,
      certification_type,
      certification_provider
    };

    console.log('📊 Processed program data:', programData);
    
    // Validate processed data before saving
    if (!programData.program_id || !programData.title || !programData.description) {
      console.error('❌ Processed data missing required fields:', programData);
      return res.status(400).json({
        success: false,
        error: 'Processed data is missing required fields'
      });
    }

    const program = new TrainingProgram(programData);
    
    console.log('📊 Program object before save:', {
      program_id: program.program_id,
      title: program.title,
      description: program.description,
      category: program.category,
      duration_hours: program.duration_hours,
      price: program.price,
      level: program.level,
      max_participants: program.max_participants,
      prerequisites: program.prerequisites,
      objectives: program.objectives,
      methods: program.methods,
      evaluation_methods: program.evaluation_methods,
      accessibility_info: program.accessibility_info,
      access_delay: program.access_delay,
      is_active: program.is_active,
      is_featured: program.is_featured,
      opco_eligible: program.opco_eligible,
      cpf_eligible: program.cpf_eligible,
      certification_type: program.certification_type,
      certification_provider: program.certification_provider,
      modules: program.modules
    });

    await program.save();

    console.log('✅ Program saved successfully:', program._id);
    res.status(201).json({
      success: true,
      message: 'Training program created successfully',
      data: { 
        program: {
          id: program._id,
          program_id: program.program_id,
          title: program.title,
          description: program.description,
          category: program.category,
          duration_hours: program.duration_hours,
          price: program.price,
          level: program.level,
          max_participants: program.max_participants,
          prerequisites: program.prerequisites,
          objectives: program.objectives,
          methods: program.methods,
          evaluation_methods: program.evaluation_methods,
          accessibility_info: program.accessibility_info,
          access_delay: program.access_delay,
          is_active: program.is_active,
          is_featured: program.is_featured,
          opco_eligible: program.opco_eligible,
          cpf_eligible: program.cpf_eligible,
          certification_type: program.certification_type,
          certification_provider: program.certification_provider,
          modules: program.modules,
          created_at: program.createdAt,
          updated_at: program.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Create training program error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      console.error('❌ Validation errors:', validationErrors);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }

    if (error.code === 11000) {
      console.error('❌ Duplicate key error:', error);
      return res.status(400).json({
        success: false,
        error: 'Program ID already exists'
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

    console.log('📊 Update request for program:', programId);
    console.log('📊 Update data received:', updates);
    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Try to find by program_id first, then by _id
    let program = await TrainingProgram.findOne({ program_id: programId });
    if (!program) {
      program = await TrainingProgram.findById(programId);
    }
    
    if (!program) {
      return res.status(404).json({
        success: false,
        error: 'Training program not found'
      });
    }

    console.log('✅ Found program to update:', program.title);

    // Update allowed fields
    const allowedFields = [
      'title', 'description', 'category', 'duration_hours', 'price', 'level', 'program_id',
      'max_participants', 'prerequisites', 'objectives', 'methods', 
      'evaluation_methods', 'accessibility_info', 'access_delay', 'is_active', 'modules',
      'is_featured', 'opco_eligible', 'cpf_eligible', 'certification_type', 'certification_provider'
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        console.log(`🔄 Updating field ${key}:`, value);
        if (key === 'objectives' || key === 'methods' || key === 'evaluation_methods') {
          program[key] = Array.isArray(value) ? value.filter(item => item && item.trim()) : 
                       (typeof value === 'string' ? value.split(',').map(item => item.trim()).filter(item => item) : []);
        } else if (key === 'modules') {
          program[key] = typeof value === 'string' ? JSON.parse(value) : value;
        } else if (key === 'duration_hours' || key === 'price' || key === 'max_participants') {
          program[key] = key === 'max_participants' ? parseInt(value) || 12 : parseFloat(value) || 0;
        } else if (key === 'is_active' || key === 'is_featured' || key === 'opco_eligible' || key === 'cpf_eligible') {
          program[key] = Boolean(value);
        } else {
          program[key] = value;
        }
      }
    }

    console.log('📊 Program before save:', {
      title: program.title,
      description: program.description,
      category: program.category,
      duration_hours: program.duration_hours,
      price: program.price,
      level: program.level,
      max_participants: program.max_participants,
      prerequisites: program.prerequisites,
      objectives: program.objectives,
      methods: program.methods,
      evaluation_methods: program.evaluation_methods,
      accessibility_info: program.accessibility_info,
      access_delay: program.access_delay,
      is_active: program.is_active,
      is_featured: program.is_featured,
      opco_eligible: program.opco_eligible,
      cpf_eligible: program.cpf_eligible,
      certification_type: program.certification_type,
      certification_provider: program.certification_provider,
      modules: program.modules
    });

    await program.save();

    console.log('✅ Program updated successfully');
    res.json({
      success: true,
      message: 'Training program updated successfully',
      data: { 
        program: {
          id: program._id,
          program_id: program.program_id,
          title: program.title,
          description: program.description,
          category: program.category,
          duration_hours: program.duration_hours,
          price: program.price,
          level: program.level,
          max_participants: program.max_participants,
          prerequisites: program.prerequisites,
          objectives: program.objectives,
          methods: program.methods,
          evaluation_methods: program.evaluation_methods,
          accessibility_info: program.accessibility_info,
          access_delay: program.access_delay,
          is_active: program.is_active,
          is_featured: program.is_featured,
          opco_eligible: program.opco_eligible,
          cpf_eligible: program.cpf_eligible,
          certification_type: program.certification_type,
          certification_provider: program.certification_provider,
          modules: program.modules,
          created_at: program.createdAt,
          updated_at: program.updatedAt
        }
      }
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

    // Try to find by program_id first, then by _id
    let program = await TrainingProgram.findOne({ program_id: programId });
    if (!program) {
      program = await TrainingProgram.findById(programId);
    }
    
    if (!program) {
      return res.status(404).json({
        success: false,
        error: 'Training program not found'
      });
    }

    // Delete all associated documents from disk
    for (const document of program.documents) {
      if (fs.existsSync(document.file_path)) {
        await deleteFile(document.file_path);
      }
    }

    // Delete program from database
    await TrainingProgram.findByIdAndDelete(program._id);

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