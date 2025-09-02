import express from 'express';
import { query, transaction } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateTrainingSessionCreation, validateUUID, validatePagination } from '../middleware/validation.js';
import { uploadTrainingMaterials, handleUploadError } from '../middleware/upload.js';
const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get all training sessions
router.get('/sessions', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status, upcoming } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];
    let paramCount = 0;

    // Add type filter
    if (type) {
      whereClause = 'WHERE ts.type = $1';
      queryParams.push(type);
      paramCount = 1;
    }

    // Add status filter
    if (status) {
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += `ts.status = $${++paramCount}`;
      queryParams.push(status);
    }

    // Add upcoming filter
    if (upcoming === 'true') {
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += `ts.start_date > CURRENT_TIMESTAMP`;
    }

    const sessionsQuery = `
      SELECT 
        ts.*,
        trainer.name as trainer_name,
        COUNT(tp.id) as participant_count,
        COUNT(CASE WHEN tp.status = 'confirmed' THEN 1 END) as confirmed_participants
      FROM training_sessions ts
      LEFT JOIN users trainer ON ts.trainer_id = trainer.id
      LEFT JOIN training_participants tp ON ts.id = tp.session_id
      ${whereClause}
      GROUP BY ts.id, trainer.name
      ORDER BY ts.start_date ASC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    queryParams.push(limit, offset);

    const result = await query(sessionsQuery, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM training_sessions ts
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        sessions: result.rows,
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
router.get('/sessions/:id', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;

    const sessionQuery = `
      SELECT 
        ts.*,
        trainer.name as trainer_name,
        trainer.email as trainer_email
      FROM training_sessions ts
      LEFT JOIN users trainer ON ts.trainer_id = trainer.id
      WHERE ts.id = $1
    `;

    const result = await query(sessionQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Training session not found'
      });
    }

    const session = result.rows[0];

    // Get participants
    const participantsResult = await query(
      `SELECT 
        tp.*,
        u.name as participant_name,
        u.email as participant_email,
        u.company as participant_company
       FROM training_participants tp
       JOIN users u ON tp.participant_id = u.id
       WHERE tp.session_id = $1
       ORDER BY tp.registration_date DESC`,
      [id]
    );

    session.participants = participantsResult.rows;

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

    const result = await transaction(async (client) => {
      // Create training session
      const sessionResult = await client.query(
        `INSERT INTO training_sessions 
         (title, description, type, category, level, duration_hours, max_participants, 
          price, location, is_remote, start_date, end_date, schedule, trainer_id,
          objectives, prerequisites, certification_provided, certification_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         RETURNING *`,
        [
          title, description, type, category, level, duration_hours, max_participants,
          price, location, is_remote, start_date, end_date,
          schedule ? JSON.parse(schedule) : null, req.user.id,
          objectives ? objectives.split(',') : [], prerequisites,
          certification_provided, certification_name
        ]
      );

      return sessionResult.rows[0];
    });

    res.status(201).json({
      success: true,
      message: 'Training session created successfully',
      data: { session: result }
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
router.post('/sessions/:id/register', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if session exists and has space
    const sessionCheck = await query(
      `SELECT ts.*, COUNT(tp.id) as current_participants
       FROM training_sessions ts
       LEFT JOIN training_participants tp ON ts.id = tp.session_id AND tp.status != 'cancelled'
       WHERE ts.id = $1 AND ts.status = 'planned'
       GROUP BY ts.id`,
      [id]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Training session not found or not available for registration'
      });
    }

    const session = sessionCheck.rows[0];

    if (parseInt(session.current_participants) >= session.max_participants) {
      return res.status(400).json({
        success: false,
        error: 'Training session is full'
      });
    }

    // Check if user is already registered
    const existingRegistration = await query(
      'SELECT id FROM training_participants WHERE session_id = $1 AND participant_id = $2',
      [id, req.user.id]
    );

    if (existingRegistration.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'You are already registered for this session'
      });
    }

    // Register user
    const result = await query(
      `INSERT INTO training_participants (session_id, participant_id, payment_amount)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, req.user.id, session.price]
    );

    res.status(201).json({
      success: true,
      message: 'Successfully registered for training session',
      data: { registration: result.rows[0] }
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
router.put('/sessions/:id', validateUUID, authorize('admin', 'trainer'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if session exists
    const sessionCheck = await query(
      'SELECT trainer_id FROM training_sessions WHERE id = $1',
      [id]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Training session not found'
      });
    }

    // Check authorization (trainer can only update their own sessions)
    if (req.user.role === 'trainer' && sessionCheck.rows[0].trainer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own training sessions'
      });
    }

    // Build update query
    const updateFields = [];
    const values = [];
    let paramCount = 0;

    const allowedFields = [
      'title', 'description', 'status', 'location', 'is_remote', 'start_date',
      'end_date', 'schedule', 'objectives', 'prerequisites', 'materials'
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${++paramCount}`);
        if (key === 'schedule' || key === 'materials') {
          values.push(JSON.stringify(value));
        } else if (key === 'objectives') {
          values.push(Array.isArray(value) ? value : value.split(','));
        } else {
          values.push(value);
        }
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const updateQuery = `
      UPDATE training_sessions 
      SET ${updateFields.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    res.json({
      success: true,
      message: 'Training session updated successfully',
      data: { session: result.rows[0] }
    });

  } catch (error) {
    console.error('Update training session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update training session'
    });
  }
});

// Record attendance
router.post('/sessions/:id/attendance', validateUUID, authorize('admin', 'trainer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { participant_id, date, present, arrival_time, departure_time, signature_data } = req.body;

    // Check if session exists and user has permission
    const sessionCheck = await query(
      'SELECT trainer_id FROM training_sessions WHERE id = $1',
      [id]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Training session not found'
      });
    }

    if (req.user.role === 'trainer' && sessionCheck.rows[0].trainer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Record attendance
    const result = await query(
      `INSERT INTO training_attendance 
       (session_id, participant_id, date, present, arrival_time, departure_time, signature_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (session_id, participant_id, date)
       DO UPDATE SET 
         present = EXCLUDED.present,
         arrival_time = EXCLUDED.arrival_time,
         departure_time = EXCLUDED.departure_time,
         signature_data = EXCLUDED.signature_data
       RETURNING *`,
      [id, participant_id, date, present, arrival_time, departure_time, signature_data]
    );

    res.json({
      success: true,
      message: 'Attendance recorded successfully',
      data: { attendance: result.rows[0] }
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
router.post('/sessions/:id/evaluations', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;
    const { evaluation_type, questions, responses, score } = req.body;

    // Check if user is registered for this session
    const registrationCheck = await query(
      'SELECT id FROM training_participants WHERE session_id = $1 AND participant_id = $2',
      [id, req.user.id]
    );

    if (registrationCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'You are not registered for this training session'
      });
    }

    // Submit evaluation
    const result = await query(
      `INSERT INTO training_evaluations 
       (session_id, participant_id, evaluation_type, questions, responses, score)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (session_id, participant_id, evaluation_type)
       DO UPDATE SET 
         questions = EXCLUDED.questions,
         responses = EXCLUDED.responses,
         score = EXCLUDED.score,
         completed_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [id, req.user.id, evaluation_type, JSON.stringify(questions), JSON.stringify(responses), score]
    );

    res.json({
      success: true,
      message: 'Evaluation submitted successfully',
      data: { evaluation: result.rows[0] }
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
    const statsQuery = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN status = 'planned' THEN 1 END) as planned_sessions,
        COUNT(CASE WHEN status = 'ongoing' THEN 1 END) as ongoing_sessions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_sessions,
        SUM(max_participants) as total_capacity,
        COUNT(DISTINCT trainer_id) as active_trainers,
        AVG(price) as average_price
      FROM training_sessions
    `;

    const participantsStatsQuery = `
      SELECT 
        COUNT(*) as total_registrations,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_registrations,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_registrations,
        SUM(payment_amount) as total_revenue
      FROM training_participants
    `;

    const [sessionStats, participantStats] = await Promise.all([
      query(statsQuery),
      query(participantsStatsQuery)
    ]);

    const stats = {
      ...sessionStats.rows[0],
      ...participantStats.rows[0]
    };

    // Convert string numbers to appropriate types
    Object.keys(stats).forEach(key => {
      if (key.includes('total') || key.includes('average') || key === 'total_revenue') {
        stats[key] = parseFloat(stats[key]) || 0;
      } else {
        stats[key] = parseInt(stats[key]) || 0;
      }
    });

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

export default router;