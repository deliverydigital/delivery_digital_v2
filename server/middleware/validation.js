import { body, param, query, validationResult } from 'express-validator';

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// MongoDB ObjectId validation
const validateMongoId = [
  param('id')
    .matches(/^[0-9a-fA-F]{24}$/)
    .withMessage('Invalid MongoDB ObjectId format'),
  handleValidationErrors
];

const validateMongoIdParam = (paramName) => [
  param(paramName)
    .matches(/^[0-9a-fA-F]{24}$/)
    .withMessage(`Invalid MongoDB ObjectId format for ${paramName}`),
  handleValidationErrors
];

// Custom string ID validation (for localStorage-based entities)
const validateStringId = [
  param('id')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Invalid ID format'),
  handleValidationErrors
];
// User validation rules
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('company')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Company name is required and must not exceed 255 characters'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number must not exceed 20 characters'),
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validateUserUpdate = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Company name must not exceed 255 characters'),
  body('phone')
    .optional()
    .isMobilePhone('fr-FR')
    .withMessage('Valid French phone number is required'),
  handleValidationErrors
];

// Project validation rules
const validateProjectCreation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),
  body('type')
    .isIn(['web', 'mobile', 'enterprise', 'cloud', 'other'])
    .withMessage('Invalid project type'),
  body('budget_range')
    .optional()
    .isIn(['small', 'medium', 'large', 'enterprise'])
    .withMessage('Invalid budget range'),
  body('timeline')
    .optional()
    .isIn(['urgent', 'normal', 'flexible', 'longterm'])
    .withMessage('Invalid timeline'),
  body('figma_url')
    .optional()
    .isURL()
    .withMessage('Invalid Figma URL'),
  body('gitlab_url')
    .optional()
    .isURL()
    .withMessage('Invalid GitLab URL'),
  handleValidationErrors
];

const validateProjectUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),
  body('status')
    .optional()
    .isIn(['submitted', 'reviewing', 'in_progress', 'completed', 'on_hold', 'cancelled'])
    .withMessage('Invalid project status'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  body('estimated_budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated budget must be a positive number'),
  body('completion_percentage')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Completion percentage must be between 0 and 100'),
  handleValidationErrors
];

// Task validation rules
const validateTaskCreation = [
  body('project_id')
    .notEmpty()
    .withMessage('Project ID is required')
    .isMongoId()
    .withMessage('Invalid project ID format'),
  body('title')
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  body('estimated_hours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated hours must be a positive number'),
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid due date format'),
  body('assigned_to')
    .optional()
    .isMongoId()
    .withMessage('Invalid assigned user ID format'),
  handleValidationErrors
];

const validateTaskUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'review', 'done', 'blocked'])
    .withMessage('Invalid task status'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  body('completion_percentage')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Completion percentage must be between 0 and 100'),
  handleValidationErrors
];

// Message validation rules
const validateMessageCreation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be between 1 and 5000 characters'),
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Subject must not exceed 255 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  handleValidationErrors
];

// Training session validation rules
const validateTrainingSessionCreation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  body('type')
    .isIn(['web', 'devops', 'security', 'hygiene', 'other'])
    .withMessage('Invalid training type'),
  body('duration_hours')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Duration must be between 1 and 1000 hours'),
  body('max_participants')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Max participants must be between 1 and 100'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('start_date')
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('end_date')
    .isISO8601()
    .withMessage('Invalid end date format'),
  handleValidationErrors
];

// Parameter validation
const validateUUID = [
  param('id')
    .isUUID()
    .withMessage('Invalid ID format'),
  handleValidationErrors
];

// Query validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['created_at', 'updated_at', 'title', 'status', 'priority'])
    .withMessage('Invalid sort field'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc'),
  handleValidationErrors
];

const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  handleValidationErrors
];

export {
  handleValidationErrors,
  validateMongoId,
  validateMongoIdParam,
  validateStringId,
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate,
  validateProjectCreation,
  validateProjectUpdate,
  validateTaskCreation,
  validateTaskUpdate,
  validateMessageCreation,
  validateTrainingSessionCreation,
  validateUUID,
  validatePagination,
  validateSearch
};