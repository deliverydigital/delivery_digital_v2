import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import {fileURLToPath} from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

import {connectDB, testConnection as testMongoConnection} from './config/mongodb.js';
import {apiRateLimit} from './middleware/auth.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import messageRoutes from './routes/messages.js';
import trainingRoutes from './routes/training.js';
import fileRoutes from './routes/files.js';
import notificationRoutes from './routes/notifications.js';
import analyticsRoutes from './routes/analytics.js';
import quotesRoutes from './routes/quotes.js';
import trainingProgramsRoutes from './routes/trainingPrograms.js';
import categoriesRoutes from './routes/categories.js';
import reclamationRoutes from './routes/reclamation.js';
import contactRoutes from './routes/contact.js';
import projectTypesRoutes from './routes/projectTypes.js';
import projectChatRoutes from './routes/projectChat.js';
import seoAdminRoutes, { publicSeoRouter } from './routes/seoAdmin.js';
import prospectsAdminRoutes from './routes/prospectsAdmin.js';
import conversationsAdminRoutes from './routes/conversationsAdmin.js';
import quotesAdminRoutes, { publicQuotesRouter } from './routes/quotesAdmin.js';
import { publicRouter as conversionsPublicRouter, adminRouter as conversionsAdminRouter } from './routes/conversions.js';
import seoAnalyticsRouter from "./routes/seoAnalytics.js";
// SEO agent autonome (drafts dans /admin/seo) - @author Rabah Ziane 2026-05-13
import { startSeoAgent } from './jobs/seoAgent.js';
import { llmsRouter } from './seo/llmsTxt.js';
import {createDummyUsers} from './scripts/createUsers.js';
import {createDummyTrainingDocuments} from './scripts/createTrainingDocuments.js';
import {seedTrainingPrograms} from './scripts/seedTrainingPrograms.js';
import {seedCategories} from './scripts/seedCategories.js';
import {execSync} from 'child_process';

const app = express();
const PORT = process.env.PORT || 3008;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "ws:", "wss:"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);
            
            // Allow localhost and ngrok URLs
            if (origin.includes('localhost') || 
                origin.includes('127.0.0.1') || 
                origin.includes('.ngrok.') ||
                origin.includes('.ngrok-free.app') ||
                origin.includes('.loca.lt')) {
                return callback(null, true);
            }
            
            // Allow any origin in development
            return callback(null, true);
        },
    // credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    // allowedHeaders: ['Content-Type', 'Authorization']
    allowedHeaders: ['Content-Type', 'Authorization', 'bypass-tunnel-reminder']

}));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({extended: true, limit: '10mb'}));

// Rate limiting for API routes
app.use('/api', apiRateLimit);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/training-programs', trainingProgramsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/reclamation', reclamationRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/project-types', projectTypesRoutes);
app.use('/api/project-chat', projectChatRoutes);
app.use('/api/admin/seo', seoAdminRoutes);
app.use('/api/seo', publicSeoRouter);
appendLlmsRouter();
function appendLlmsRouter(){ app.use('/', llmsRouter); }
app.use('/api/admin/prospects', prospectsAdminRoutes);
app.use('/api/admin/conversations', conversationsAdminRoutes);
app.use('/api/admin/quotes-quick', quotesAdminRoutes);
app.use('/api/conversions', conversionsPublicRouter);
app.use('/api/admin/conversions', conversionsAdminRouter);
app.use("/api/admin/seo-analytics", seoAnalyticsRouter);
app.use('/devis', publicQuotesRouter);

// Robots.txt (servi par express pour cohérence avec sitemap dynamique)
app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(`# DELIVERY Digital - robots.txt
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /reset-password
Disallow: /reclamation

User-agent: Googlebot
Allow: /
User-agent: Bingbot
Allow: /
User-agent: DuckDuckBot
Allow: /
User-agent: Applebot
Allow: /

User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-Web
Allow: /
User-agent: anthropic-ai
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Perplexity-User
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Applebot-Extended
Allow: /
User-agent: CCBot
Allow: /
User-agent: Bytespider
Allow: /
User-agent: Meta-ExternalAgent
Allow: /

Sitemap: https://deliverydigital.fr/sitemap.xml
`);
});

// Dynamic sitemap.xml (toutes les pages SEO publiees + statiques)
app.get('/sitemap.xml', async (req, res) => {
  try {
    const { SeoContent } = await import('./models/index.js');
    const items = await SeoContent.find({ status: 'published' })
      .select('slug type updatedAt')
      .lean();

    const today = new Date().toISOString().slice(0, 10);
    const urls = [
      { loc: 'https://deliverydigital.fr/', priority: '1.0', changefreq: 'weekly', lastmod: today },
      { loc: 'https://deliverydigital.fr/discutons', priority: '0.9', changefreq: 'weekly', lastmod: today },
    ];

    for (const it of items) {
      const path = it.type === 'article' ? `/blog/${it.slug}` : `/services/${it.slug}`;
      urls.push({
        loc: `https://deliverydigital.fr${path}`,
        priority: '0.8',
        changefreq: 'monthly',
        lastmod: (it.updatedAt || new Date()).toISOString().slice(0, 10),
      });
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.send(xml);
  } catch (e) {
    res.status(500).send('sitemap error: ' + e.message);
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    const buildPath = path.join(__dirname, '../dist');

    // Serve static files
    app.use(express.static(buildPath));

    // Handle client-side routing
    app.get('*', (req, res) => {
        res.sendFile(path.join(buildPath, 'index.html'));
    });
}

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV !== 'production';

    res.status(err.status || 500).json({
        success: false,
        error: isDevelopment ? err.message : 'Internal server error',
        ...(isDevelopment && {stack: err.stack})
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint not found'
    });
});

// Start server
const startServer = async () => {
    try {
        console.log('🚀 Starting DELIVERY Digital server...');
        console.log('🔧 Environment:', process.env.NODE_ENV || 'development');

        // Auto-setup MongoDB if needed
        await autoSetupMongoDB();

        // Connect to MongoDB (this will handle the connection gracefully)
        try {
            console.log('🔄 Attempting MongoDB connection...');
            await connectDB();

            // Check connection state immediately
            console.log('🔍 Checking MongoDB connection state...');

            console.log('<UNK> Connected');

            if (false) {
                console.log('<UNK> Connected');
                console.log('✅ MongoDB connection successful');
                await testMongoConnection();

                // Create dummy users only if MongoDB is connected
                try {
                    await createDummyUsers();
                    console.log('✅ Dummy users created/verified');

                    // Create dummy training documents
                    await createDummyTrainingDocuments();
                    console.log('✅ Dummy training documents created/verified');

                    // Seed training programs
                    await seedTrainingPrograms();
                    console.log('✅ Training programs seeded/verified');

                    // Seed categories
                    await seedCategories();
                    console.log('✅ Categories seeded/verified');
                    // Seed training programs
                    await seedTrainingPrograms();
                    console.log('✅ Training programs seeded/verified');

                    // Seed categories
                    await seedCategories();
                    console.log('✅ Categories seeded/verified');
                } catch (userError) {
                    console.warn('⚠️ Could not create dummy users:', userError.message);
                }
            } else {
                console.warn('⚠️ MongoDB not connected, continuing without database');
                console.warn('⚠️ Database-dependent features will be unavailable');
            }
        } catch (dbError) {
            console.warn('⚠️ MongoDB connection failed:', dbError.message);
            console.warn('⚠️ Continuing without database - API endpoints will return 503 errors');
        }

        // Ensure upload directories exist
        const uploadDirs = [
            'uploads/projects',
            'uploads/tasks',
            'uploads/messages',
            'uploads/training',
            'uploads/profiles',
            'uploads/general'
        ];

        uploadDirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, {recursive: true});
            }
        });

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
            console.log(`🔗 Health Check: http://localhost:${PORT}/health`);

            if (process.env.NODE_ENV !== 'production') {
                console.log(`🌐 Frontend URL: http://localhost:5173`);
            }

            console.log('✅ Server startup completed successfully');
            try { startSeoAgent(); } catch (e) { console.error('seo-agent boot failed:', e.message); }
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        console.error('❌ Server will not start due to critical error');
        // Don't exit in development to allow for debugging
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
};

// Auto-setup MongoDB function
const autoSetupMongoDB = async () => {
    try {
        console.log('🔧 Auto-setup MongoDB...');

        // Check if MongoDB is accessible
        const isMongoAccessible = await checkMongoDBAccessibility();
        if (!isMongoAccessible) {
            console.log('📦 MongoDB not accessible, attempting auto-setup...');

            // Try to run the setup script
            try {
                console.log('🔄 Running MongoDB setup script...');
                execSync('node server/scripts/install-mongodb.js', {
                    stdio: 'inherit',
                });
                console.log('✅ MongoDB setup script completed');
            } catch (setupError) {
                console.log('⚠️ MongoDB setup script failed:', setupError.message);
                console.log('💡 You may need to install MongoDB manually or check your cloud connection');
            }
        } else {
            console.log('✅ MongoDB is accessible, skipping auto-setup');
        }
    } catch (error) {
        console.log('⚠️ Auto-setup MongoDB failed:', error.message);
        console.log('🔄 Continuing with server startup...');
    }
};

// Check if MongoDB is accessible
const checkMongoDBAccessibility = async () => {
    try {
        // Quick connection test with short timeout
        const mongoose = await import('mongoose');
        const testConnection = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/delivery_digital', {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000
        });

        await testConnection.connection.close();
        return true;
    } catch (error) {
        console.log(error)
        return false;
    }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Start the server
startServer();

export {app}; // Export for testing