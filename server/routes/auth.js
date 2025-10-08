import express from 'express';
import bcrypt from 'bcryptjs';
import { generateToken, authRateLimit } from '../middleware/auth.js';
import { validateUserRegistration, validateUserLogin } from '../middleware/validation.js';
import { User } from '../models/index.js';
import { isMongoAvailable } from '../config/mongodb.js';

const router = express.Router();

// Apply rate limiting to auth routes
router.use(authRateLimit);

// Register new user
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    console.log('🔄 Registration attempt for:', req.body.email);
    console.log('📊 Request body:', { ...req.body, password: '[HIDDEN]' });
    
    const { email, password, name, company, phone } = req.body;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      console.log('❌ MongoDB not available for registration');
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Check if user already exists
    console.log('🔍 Checking if user exists:', email);
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      console.log('❌ User already exists:', email);
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Create user (password will be hashed by pre-save middleware)
    console.log('👤 Creating user:', email);
    const userData = {
      email,
      password_hash: password,
      name,
      company,
      phone,
      role: 'client',
      status: 'active',
      email_verified: false
    };

    const user = new User(userData);
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id.toString());

    console.log('✅ Registration successful for:', email);
    console.log('📊 Sending response with user:', { id: user._id, email: user.email, name: user.name });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        company: user.company,
        phone: user.phone,
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      console.error('❌ Validation errors:', validationErrors);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      console.error('❌ Duplicate key error:', error);
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    console.error('❌ Unexpected registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Login user
router.post('/login', validateUserLogin, async (req, res) => {
  try {
    console.log('🔄 Login attempt for:', req.body.email);
    
    const { email, password } = req.body;

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      console.log('❌ MongoDB not available for login');
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Find user by email
    console.log('🔍 Looking for user:', email);
    const user = await User.findByEmail(email);
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      console.log('❌ User not active:', email, 'Status:', user.status);
      return res.status(401).json({
        success: false,
        error: 'Account is not active'
      });
    }

    // Verify password
    console.log('🔐 Verifying password for:', email);
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id.toString());

    console.log('✅ Login successful for:', email);
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        company: user.company,
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    
    // Always return success to prevent email enumeration
    if (!user || user.status !== 'active') {
      return res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send password reset email
    try {
      const nodemailer = await import('nodemailer');

      // Create transporter
      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // Create reset URL
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

      // Send email
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Réinitialisation de votre mot de passe - Delivery Digital',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Réinitialisation de mot de passe</h2>
            <p>Bonjour,</p>
            <p>Vous avez demandé à réinitialiser votre mot de passe sur Delivery Digital.</p>
            <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Réinitialiser mon mot de passe
              </a>
            </div>
            <p>Ou copiez ce lien dans votre navigateur :</p>
            <p style="background-color: #f3f4f6; padding: 10px; border-radius: 5px; word-break: break-all;">
              ${resetUrl}
            </p>
            <p><strong>Ce lien est valable pendant 1 heure.</strong></p>
            <p>Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              Delivery Digital<br>
              Support: contact@deliverydigital.fr
            </p>
          </div>
        `
      });

      console.log(`✅ Password reset email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      // Still return success to prevent email enumeration
    }

    res.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent'
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      error: 'Password reset request failed'
    });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      password_reset_token: token,
      password_reset_expires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // Update user password and clear reset token (password will be hashed by pre-save middleware)
    user.password_hash = newPassword;
    user.password_reset_token = undefined;
    user.password_reset_expires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Password reset failed'
    });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required'
      });
    }

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Find user with verification token
    const user = await User.findOne({
      email_verification_token: token
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification token'
      });
    }

    // Mark email as verified
    user.email_verified = true;
    user.email_verification_token = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Email verification failed'
    });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token and get user
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
    
    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const user = await User.findById(decoded.userId).select('-password_hash -password_reset_token -email_verification_token');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        company: user.company,
        phone: user.phone,
        role: user.role,
        status: user.status,
        email_verified: user.email_verified,
        last_login: user.last_login,
        created_at: user.createdAt,
        client_info: user.client_info
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
});

export default router;