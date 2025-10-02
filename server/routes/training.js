import express from 'express';
import { User, TrainingDocument } from '../models/index.js';
import { isMongoAvailable } from '../config/mongodb.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateTrainingSessionCreation, validateStringId, validatePagination } from '../middleware/validation.js';
import { uploadTrainingMaterials, handleUploadError } from '../middleware/upload.js';
import path from 'path';
import fs from 'fs';
const router = express.Router();

// Training Session Schema (using localStorage for demo)
const getTrainingSessions = () => {
  try {
    const sessions = localStorage.getItem('trainingSessions');
    return sessions ? JSON.parse(sessions) : [];
  } catch (error) {
    console.error('Error reading training sessions:', error);
    return [];
  }
};

const saveTrainingSessions = (sessions) => {
  try {
    localStorage.setItem('trainingSessions', JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving training sessions:', error);
  }
};

// Fallback demo documents for when database is unavailable
const getFallbackDocuments = (programId, req) => {
  const baseUrl = req ? `${req.protocol}://${req.get('host')}` : '';
  const fallbackData = {
    'wordpress': [
      {
        id: 'demo-wp-1',
        title: 'Programme détaillé',
        description: 'Contenu complet de la formation',
        filename: 'wordpress-program.pdf',
        original_name: 'Programme WordPress.pdf',
        file_type: 'application/pdf',
        file_size: 1024000,
        download_count: 45,
        category: 'program',
        tags: ['wordpress', 'cms'],
        version: '1.0',
        created_at: new Date(),
        download_url: '#demo-download'
      },
      {
        id: 'demo-wp-2',
        title: 'Guide pratique',
        description: 'Exercices et ressources',
        filename: 'wordpress-guide.pdf',
        original_name: 'Guide WordPress.pdf',
        file_type: 'application/pdf',
        file_size: 512000,
        download_count: 32,
        category: 'guide',
        tags: ['wordpress', 'guide'],
        version: '1.0',
        created_at: new Date(),
        download_url: '#demo-download'
      },
      {
        id: 'demo-wp-3',
        title: 'Modèle de certificat',
        description: 'Aperçu du certificat de fin de formation',
        filename: 'wordpress-certificate.pdf',
        original_name: 'Certificat WordPress.pdf',
        file_type: 'application/pdf',
        file_size: 256000,
        download_count: 18,
        category: 'certificate',
        tags: ['wordpress', 'certificat'],
        version: '1.0',
        created_at: new Date(),
        download_url: '#demo-download'
      }
    ]
  };

  return fallbackData[programId] || [];
};

// PUBLIC ROUTES - No authentication required

// Get training documents for a program (public)
router.get('/documents/:programId', async (req, res) => {
  try {
    const { programId } = req.params;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      // Return demo fallback data for demonstration purposes
      const demoDocuments = getFallbackDocuments(programId, req);
      return res.json({
        success: true,
        data: { documents: demoDocuments }
      });
    }

    const documents = await TrainingDocument.findByProgram(programId);

    res.json({
      success: true,
      data: {
        documents: documents.map(doc => ({
          id: doc._id,
          title: doc.title,
          description: doc.description,
          filename: doc.filename,
          original_name: doc.original_name,
          file_type: doc.file_type,
          file_size: doc.file_size,
          download_count: doc.download_count,
          category: doc.category,
          tags: doc.tags,
          version: doc.version,
          uploaded_by: doc.uploaded_by?.name,
          created_at: doc.createdAt,
          download_url: `${req.protocol}://${req.get('host')}/api/training/documents/${doc._id}/download`
        }))
      }
    });

  } catch (error) {
    console.error('Get training documents error:', error);
    // Return demo data as fallback
    const demoDocuments = getFallbackDocuments(req.params.programId, req);
    res.json({
      success: true,
      data: { documents: demoDocuments }
    });
  }
});

// Download training document (public)
router.get('/documents/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if this is a demo document request
    if (id.startsWith('demo-')) {
      // Return a simple PDF placeholder for demo
      const demoContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
endobj
5 0 obj
<< /Length 85 >>
stream
BT
/F1 24 Tf
100 700 Td
(Document de demonstration) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000214 00000 n
0000000304 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
438
%%EOF`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="document-demo.pdf"`);
      return res.send(demoContent);
    }

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const document = await TrainingDocument.findById(id);

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
    await document.incrementDownloadCount();

    // Set download headers
    res.setHeader('Content-Type', document.file_type);
    res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`);
    res.setHeader('Content-Length', document.file_size);

    // Stream the file
    const fileStream = fs.createReadStream(document.file_path);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download training document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download document'
    });
  }
});

// PROTECTED ROUTES - Authentication required
router.use(authenticate);

// Get all training sessions
router.get('/sessions', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status, upcoming } = req.query;
    const skip = (page - 1) * limit;

    // For demo purposes, using localStorage
    // In production, you would create a TrainingSession MongoDB model
    let sessions = getTrainingSessions();

    // Apply filters
    if (type) {
      sessions = sessions.filter(s => s.type === type);
    }
    if (status) {
      sessions = sessions.filter(s => s.status === status);
    }
    if (upcoming === 'true') {
      const now = new Date();
      sessions = sessions.filter(s => new Date(s.startDate) > now);
    }

    // Pagination
    const total = sessions.length;
    const paginatedSessions = sessions.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: {
        sessions: paginatedSessions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get training sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch training sessions'
    });
  }
});

// Get single training session
router.get('/sessions/:id', validateStringId, async (req, res) => {
  try {
    const { id } = req.params;

    const sessions = getTrainingSessions();
    const session = sessions.find(s => s.id === id);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Training session not found'
      });
    }

    res.json({
      success: true,
      data: { session }
    });

  } catch (error) {
    console.error('Get training session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch training session'
    });
  }
});

// Create new training session (admin/trainer only)
router.post('/sessions', authorize('admin', 'trainer'), uploadTrainingMaterials, handleUploadError, validateTrainingSessionCreation, async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      category,
      level,
      duration_hours,
      max_participants,
      price,
      location,
      is_remote,
      start_date,
      end_date,
      schedule,
      objectives,
      prerequisites,
      certification_provided,
      certification_name
    } = req.body;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const newSession = {
      id: `session-${Date.now()}`,
      title,
      description,
      type,
      category,
      level: level || 'beginner',
      duration_hours: parseInt(duration_hours),
      max_participants: parseInt(max_participants) || 12,
      price: parseFloat(price),
      location,
      is_remote: is_remote === 'true',
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      schedule: schedule ? JSON.parse(schedule) : null,
      trainer_id: req.user.id,
      trainer_name: req.user.name,
      status: 'planned',
      objectives: objectives ? objectives.split(',').map(o => o.trim()) : [],
      prerequisites,
      certification_provided: certification_provided === 'true',
      certification_name,
      participants: [],
      materials: req.files ? req.files.map(file => ({
        filename: file.filename,
        original_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        file_path: file.path,
        uploaded_at: new Date()
      })) : [],
      created_at: new Date(),
      updated_at: new Date()
    };

    const sessions = getTrainingSessions();
    sessions.push(newSession);
    saveTrainingSessions(sessions);

    res.status(201).json({
      success: true,
      message: 'Training session created successfully',
      data: { session: newSession }
    });

  } catch (error) {
    console.error('Create training session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create training session'
    });
  }
});

// Register for training session
router.post('/sessions/:id/register', validateStringId, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const sessions = getTrainingSessions();
    const sessionIndex = sessions.findIndex(s => s.id === id);

    if (sessionIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Training session not found'
      });
    }

    const session = sessions[sessionIndex];

    // Check if session is available for registration
    if (session.status !== 'planned') {
      return res.status(400).json({
        success: false,
        error: 'Training session is not available for registration'
      });
    }

    // Check if session is full
    if (session.participants.length >= session.max_participants) {
      return res.status(400).json({
        success: false,
        error: 'Training session is full'
      });
    }

    // Check if user is already registered
    const isAlreadyRegistered = session.participants.some(p => p.participant_id === req.user.id);
    if (isAlreadyRegistered) {
      return res.status(400).json({
        success: false,
        error: 'You are already registered for this session'
      });
    }

    // Add participant
    const newParticipant = {
      id: `participant-${Date.now()}`,
      participant_id: req.user.id,
      participant_name: req.user.name,
      participant_email: req.user.email,
      participant_company: req.user.company,
      registration_date: new Date(),
      status: 'registered',
      payment_status: 'pending',
      payment_amount: session.price
    };

    session.participants.push(newParticipant);
    sessions[sessionIndex] = session;
    saveTrainingSessions(sessions);

    res.status(201).json({
      success: true,
      message: 'Successfully registered for training session',
      data: { registration: newParticipant }
    });

  } catch (error) {
    console.error('Register for training error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register for training session'
    });
  }
});

// Update training session (admin/trainer only)
router.put('/sessions/:id', validateStringId, authorize('admin', 'trainer'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const sessions = getTrainingSessions();
    const sessionIndex = sessions.findIndex(s => s.id === id);

    if (sessionIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Training session not found'
      });
    }

    const session = sessions[sessionIndex];

    // Check authorization (trainer can only update their own sessions)
    if (req.user.role === 'trainer' && session.trainer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own training sessions'
      });
    }

    // Update allowed fields
    const allowedFields = [
      'title', 'description', 'status', 'location', 'is_remote', 'start_date',
      'end_date', 'schedule', 'objectives', 'prerequisites', 'materials'
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        if (key === 'start_date' || key === 'end_date') {
          session[key] = new Date(value);
        } else if (key === 'schedule' || key === 'materials') {
          session[key] = typeof value === 'string' ? JSON.parse(value) : value;
        } else if (key === 'objectives') {
          session[key] = Array.isArray(value) ? value : value.split(',').map(o => o.trim());
        } else {
          session[key] = value;
        }
      }
    }

    session.updated_at = new Date();
    sessions[sessionIndex] = session;
    saveTrainingSessions(sessions);

    res.json({
      success: true,
      message: 'Training session updated successfully',
      data: { session }
    });

  } catch (error) {
    console.error('Update training session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update training session'
    });
  }
});

// Record attendance (admin/trainer only)
router.post('/sessions/:id/attendance', validateStringId, authorize('admin', 'trainer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { participant_id, date, present, arrival_time, departure_time, signature_data } = req.body;

    const sessions = getTrainingSessions();
    const sessionIndex = sessions.findIndex(s => s.id === id);

    if (sessionIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Training session not found'
      });
    }

    const session = sessions[sessionIndex];

    // Check authorization
    if (req.user.role === 'trainer' && session.trainer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Find participant
    const participantIndex = session.participants.findIndex(p => p.participant_id === participant_id);
    if (participantIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Participant not found in this session'
      });
    }

    // Record attendance
    const attendanceRecord = {
      id: `attendance-${Date.now()}`,
      participant_id,
      date: new Date(date),
      present,
      arrival_time,
      departure_time,
      signature_data,
      recorded_by: req.user.id,
      recorded_at: new Date()
    };

    if (!session.attendance) {
      session.attendance = [];
    }

    // Remove existing attendance for this participant and date
    session.attendance = session.attendance.filter(a => 
      !(a.participant_id === participant_id && a.date === date)
    );

    // Add new attendance record
    session.attendance.push(attendanceRecord);

    sessions[sessionIndex] = session;
    saveTrainingSessions(sessions);

    res.json({
      success: true,
      message: 'Attendance recorded successfully',
      data: { attendance: attendanceRecord }
    });

  } catch (error) {
    console.error('Record attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record attendance'
    });
  }
});

// Submit evaluation
router.post('/sessions/:id/evaluations', validateStringId, async (req, res) => {
  try {
    const { id } = req.params;
    const { evaluation_type, questions, responses, score } = req.body;

    const sessions = getTrainingSessions();
    const session = sessions.find(s => s.id === id);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Training session not found'
      });
    }

    // Check if user is registered for this session
    const isRegistered = session.participants.some(p => p.participant_id === req.user.id);
    if (!isRegistered) {
      return res.status(403).json({
        success: false,
        error: 'You are not registered for this training session'
      });
    }

    const evaluation = {
      id: `evaluation-${Date.now()}`,
      session_id: id,
      participant_id: req.user.id,
      participant_name: req.user.name,
      evaluation_type,
      questions: typeof questions === 'string' ? JSON.parse(questions) : questions,
      responses: typeof responses === 'string' ? JSON.parse(responses) : responses,
      score: score ? parseFloat(score) : null,
      completed_at: new Date()
    };

    if (!session.evaluations) {
      session.evaluations = [];
    }

    // Remove existing evaluation of same type from same participant
    session.evaluations = session.evaluations.filter(e => 
      !(e.participant_id === req.user.id && e.evaluation_type === evaluation_type)
    );

    // Add new evaluation
    session.evaluations.push(evaluation);

    // Update sessions
    const sessionIndex = sessions.findIndex(s => s.id === id);
    sessions[sessionIndex] = session;
    saveTrainingSessions(sessions);

    res.json({
      success: true,
      message: 'Evaluation submitted successfully',
      data: { evaluation }
    });

  } catch (error) {
    console.error('Submit evaluation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit evaluation'
    });
  }
});

// Get training statistics (admin only)
router.get('/stats/overview', authorize('admin'), async (req, res) => {
  try {
    const sessions = getTrainingSessions();

    const stats = {
      total_sessions: sessions.length,
      planned_sessions: sessions.filter(s => s.status === 'planned').length,
      ongoing_sessions: sessions.filter(s => s.status === 'ongoing').length,
      completed_sessions: sessions.filter(s => s.status === 'completed').length,
      cancelled_sessions: sessions.filter(s => s.status === 'cancelled').length,
      total_capacity: sessions.reduce((sum, s) => sum + (s.max_participants || 0), 0),
      total_registrations: sessions.reduce((sum, s) => sum + (s.participants?.length || 0), 0),
      confirmed_registrations: sessions.reduce((sum, s) => 
        sum + (s.participants?.filter(p => p.status === 'confirmed').length || 0), 0),
      total_revenue: sessions.reduce((sum, s) => 
        sum + (s.participants?.reduce((pSum, p) => 
          pSum + (p.payment_status === 'paid' ? (p.payment_amount || 0) : 0), 0) || 0), 0),
      average_price: sessions.length > 0 
        ? sessions.reduce((sum, s) => sum + (s.price || 0), 0) / sessions.length 
        : 0,
      active_trainers: [...new Set(sessions.map(s => s.trainer_id).filter(Boolean))].length
    };

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    console.error('Get training stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch training statistics'
    });
  }
});

// Get participant's training sessions
router.get('/my-sessions', async (req, res) => {
  try {
    const sessions = getTrainingSessions();
    
    // Filter sessions where user is a participant
    const mySessions = sessions.filter(session => 
      session.participants?.some(p => p.participant_id === req.user.id)
    ).map(session => {
      const myParticipation = session.participants.find(p => p.participant_id === req.user.id);
      return {
        id: session.id,
        title: session.title,
        description: session.description,
        type: session.type,
        start_date: session.start_date,
        end_date: session.end_date,
        location: session.location,
        is_remote: session.is_remote,
        trainer_name: session.trainer_name,
        status: session.status,
        my_status: myParticipation.status,
        payment_status: myParticipation.payment_status,
        payment_amount: myParticipation.payment_amount,
        registration_date: myParticipation.registration_date
      };
    });

    res.json({
      success: true,
      data: { sessions: mySessions }
    });

  } catch (error) {
    console.error('Get my training sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch your training sessions'
    });
  }
});

// Update participant status (admin/trainer only)
router.put('/sessions/:sessionId/participants/:participantId', 
  validateStringId, 
  authorize('admin', 'trainer'), 
  async (req, res) => {
    try {
      const { sessionId, participantId } = req.params;
      const { status, payment_status, notes } = req.body;

      const sessions = getTrainingSessions();
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);

      if (sessionIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Training session not found'
        });
      }

      const session = sessions[sessionIndex];

      // Check authorization
      if (req.user.role === 'trainer' && session.trainer_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Find participant
      const participantIndex = session.participants.findIndex(p => p.participant_id === participantId);
      if (participantIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Participant not found'
        });
      }

      // Update participant
      if (status) session.participants[participantIndex].status = status;
      if (payment_status) {
        session.participants[participantIndex].payment_status = payment_status;
        if (payment_status === 'paid') {
          session.participants[participantIndex].payment_date = new Date();
        }
      }
      if (notes) session.participants[participantIndex].notes = notes;

      sessions[sessionIndex] = session;
      saveTrainingSessions(sessions);

      res.json({
        success: true,
        message: 'Participant updated successfully',
        data: { participant: session.participants[participantIndex] }
      });

    } catch (error) {
      console.error('Update participant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update participant'
      });
    }
  }
);

// Upload training document (admin only)
router.post('/documents', authorize('admin'), uploadTrainingMaterials, handleUploadError, async (req, res) => {
  try {
    const {
      program_id,
      program_name,
      title,
      description,
      category,
      tags,
      version
    } = req.body;

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

    const uploadedDocuments = [];

    for (const file of req.files) {
      // Only allow PDF files
      if (file.mimetype !== 'application/pdf') {
        continue;
      }

      const documentData = {
        program_id,
        program_name,
        title: title || file.originalname,
        description,
        filename: file.filename,
        original_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        file_path: file.path,
        uploaded_by: req.user.id,
        category: category || 'program',
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
        version: version || '1.0'
      };

      const document = new TrainingDocument(documentData);
      await document.save();
      
      await document.populate('uploaded_by', 'name email');
      uploadedDocuments.push(document);
    }

    res.status(201).json({
      success: true,
      message: 'Training documents uploaded successfully',
      data: {
        documents: uploadedDocuments.map(doc => ({
          id: doc._id,
          title: doc.title,
          description: doc.description,
          filename: doc.filename,
          original_name: doc.original_name,
          file_type: doc.file_type,
          file_size: doc.file_size,
          category: doc.category,
          tags: doc.tags,
          version: doc.version,
          uploaded_by: doc.uploaded_by.name,
          created_at: doc.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Upload training documents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload training documents'
    });
  }
});

// Get all training documents (admin only)
router.get('/documents', authorize('admin'), async (req, res) => {
  try {
    const { program_id, category, search } = req.query;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    let documents;

    if (search) {
      documents = await TrainingDocument.searchDocuments(search);
    } else if (program_id) {
      documents = await TrainingDocument.findByProgram(program_id);
    } else if (category) {
      documents = await TrainingDocument.findByCategory(category);
    } else {
      documents = await TrainingDocument.find()
        .populate('uploaded_by', 'name email')
        .sort({ createdAt: -1 });
    }

    res.json({
      success: true,
      data: {
        documents: documents.map(doc => ({
          id: doc._id,
          program_id: doc.program_id,
          program_name: doc.program_name,
          title: doc.title,
          description: doc.description,
          filename: doc.filename,
          original_name: doc.original_name,
          file_type: doc.file_type,
          file_size: doc.file_size,
          download_count: doc.download_count,
          category: doc.category,
          tags: doc.tags,
          version: doc.version,
          uploaded_by: doc.uploaded_by?.name,
          created_at: doc.createdAt,
          download_url: `${req.protocol}://${req.get('host')}/api/training/documents/${doc._id}/download`
        }))
      }
    });

  } catch (error) {
    console.error('Get all training documents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch training documents'
    });
  }
});

// Delete training document (admin only)
router.delete('/documents/:id', authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const document = await TrainingDocument.findById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Delete file from disk
    if (fs.existsSync(document.file_path)) {
      fs.unlinkSync(document.file_path);
    }

    // Delete document from database
    await TrainingDocument.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Training document deleted successfully'
    });

  } catch (error) {
    console.error('Delete training document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete training document'
    });
  }
});

// Delete training session (admin only)
router.delete('/sessions/:id', validateStringId, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const sessions = getTrainingSessions();
    const filteredSessions = sessions.filter(s => s.id !== id);

    if (sessions.length === filteredSessions.length) {
      return res.status(404).json({
        success: false,
        error: 'Training session not found'
      });
    }

    saveTrainingSessions(filteredSessions);

    res.json({
      success: true,
      message: 'Training session deleted successfully'
    });

  } catch (error) {
    console.error('Delete training session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete training session'
    });
  }
});

export default router;