console.log('🔥 SERVER.JS STARTING - Line 1 reached! (Restarted for Reminders fix)');
require('dotenv').config();
console.log('✅ Dotenv loaded successfully');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cluster = require('cluster');
const os = require('os');
console.log('✅ Express modules loaded');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
console.log('✅ Config modules loaded');
console.log('📦 Loading route modules...');

let smartAutomationRoutes = null;
try {
  smartAutomationRoutes = require('../AI/smart_automation/api');
  console.log('  ✓ Smart Automation routes loaded');
} catch (err) {
  console.log('  ✗ Smart Automation routes failed:', err.message);
}

let customerInsightsRoutes = null;
try {
  customerInsightsRoutes = require('./routes/customerInsights');
  console.log('  ✓ Customer Insights routes loaded');
} catch (err) {
  console.log('  ✗ Customer Insights routes failed:', err.message);
}

let newAutomationRoutes = null;
try {
  newAutomationRoutes = require('../AI/smart_automation/api/automation_routes_new'); // New Automation routes import
  console.log('  ✓ New Automation routes loaded');
} catch (err) {
  console.log('  ✗ New Automation routes failed:', err.message);
}

let aiSupportRoutes = null;
try {
  aiSupportRoutes = require('./routes/aiSupport'); // AI Support routes
  console.log('  ✓ AI Support routes loaded');
} catch (err) {
  console.log('  ✗ AI Support routes failed:', err.message);
}

console.log('✅ All route modules loaded (some may have failed)');

// Prevent process from crashing on unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('⚠️  Unhandled promise rejection:', err?.message || err);
  console.error('Stack:', err?.stack);
  // DON'T EXIT - log it and continue
});

// Initialize express app
const app = express();
console.log('✅ Express app initialized');

// Connect to database (non-blocking)
(async () => {
  try {
    console.log('🚀 Starting Vlite Furniture ERP Backend...');
    console.log('📍 Current working directory:', process.cwd());
    console.log('🔧 Node environment:', process.env.NODE_ENV || 'development');

    const dbConnection = await connectDB();
    if (dbConnection) {
      console.log('✅ Database connection established successfully');

      // SINGLE TENANT: Validate Vlite organization exists
      try {
        const vliteConfig = require('./config/vlite.config');
        const Organization = require('./models/shared/Organization');

        const vliteOrg = await Organization.findById(vliteConfig.organizationId);
        if (!vliteOrg) {
          console.error('❌ VLITE ORGANIZATION NOT FOUND!');
          console.error(`   Expected ID: ${vliteConfig.organizationId}`);
          console.error('   Please check VLITE_ORG_ID in .env file');
          logger.error('Vlite organization not found in database');
        } else {
          console.log('✅ Vlite organization validated:');
          console.log(`   Name: ${vliteOrg.name}`);
          console.log(`   Slug: ${vliteOrg.slug}`);
          console.log(`   Database: ${vliteOrg.database?.name}`);
          console.log(`   Active: ${vliteOrg.isActive}`);
          logger.info(`Single-tenant mode: ${vliteOrg.name}`);
        }
      } catch (validationError) {
        console.error('⚠️  Error validating Vlite organization:', validationError.message);
      }
    } else {
      console.log('⚠️  Database connection failed, but server will continue');
    }
  } catch (err) {
    console.error('❌ Failed to connect to database:', err.message);
    console.error('   Full error:', err);
    // Continue - server will run anyway
    console.log('🔄 Server starting without database connection...');
  }
})();

// ========================================
// INITIALIZE BACKGROUND JOBS
// ========================================
let stockMonitoringJob = null;
try {
  stockMonitoringJob = require('./jobs/stockMonitoring');
  stockMonitoringJob.start();
  console.log('✅ Stock monitoring background job started');
} catch (err) {
  console.log('⚠️  Failed to start stock monitoring job:', err.message);
}

let reminderScheduler = null;
try {
  reminderScheduler = require('./jobs/reminderScheduler');
  reminderScheduler.start();
  console.log('✅ Reminder scheduler background job started');
} catch (err) {
  console.log('⚠️  Failed to start reminder scheduler:', err.message);
}


// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
}));

// Rate limiting - increased for development
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased from 100 to 1000
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compression middleware
app.use(compression());

// HTTP request logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
console.log('📝 Loading routes...');
app.use('/api/auth', require('./routes/auth'));
console.log('  ✓ Auth routes loaded');
app.use('/api/admin', require('./routes/admin'));
console.log('  ✓ Admin routes loaded');
app.use('/api/org', require('./routes/org'));
console.log('  ✓ Org routes loaded');
app.use('/api/users', require('./routes/users'));
console.log('  ✓ User routes loaded');
app.use('/api/roles', require('./routes/roles'));
console.log('  ✓ Role routes loaded');
app.use('/api/rawmaterial', require('./routes/rawMaterial'));
console.log('  ✓ Raw material routes loaded');
app.use('/api/user-access', require('./routes/userAccess'));
console.log('  ✓ User access routes loaded');
app.use('/api/crm', require('./routes/crm'));
console.log('  ✓ CRM routes loaded');
app.use('/api/debug', require('./routes/debug')); // Debug route
console.log('  ✓ Debug routes loaded');
app.use('/api/debug-user', require('./routes/debug-user')); // Debug user route
console.log('  ✓ Debug user routes loaded');
app.use('/api/fix-user-role', require('./routes/fix-user-role')); // Fix user role route
console.log('  ✓ Fix user role routes loaded');
app.use('/api/debug-quote', require('./routes/debug-quote')); // Debug quote route
console.log('  ✓ Debug quote routes loaded');
app.use('/api/fix-data', require('./routes/fix-data')); // Fix data route
console.log('  ✓ Fix data routes loaded');
app.use('/api/quotations', require('./routes/quotations'));
console.log('  ✓ Quotation routes loaded');
app.use('/api/upload', require('./routes/upload'));
console.log('  ✓ Upload routes loaded');
app.use('/api/payments', require('./routes/payments'));
console.log('  ✓ Payment routes loaded');
app.use('/api/dashboard', require('./routes/dashboard'));
console.log('  ✓ Dashboard routes loaded');
app.use('/api/subscription', require('./routes/subscription'));
console.log('  ✓ Subscription routes loaded');

try {
  app.use('/api/inventory', require('./routes/inventory'));
  console.log('  ✓ Inventory routes loaded');
} catch (err) {
  console.log('  ✗ Error loading inventory routes:', err.message);
  console.log('  Stack:', err.stack);
}

app.use('/api/machines', require('./routes/machines'));
console.log('  ✓ Machines routes loaded');

try {
  app.use('/api/transports', require('./routes/transport'));
  console.log('  ✓ Transport routes loaded');
} catch (err) {
  console.log('  ✗ Error loading transport routes:', err.message);
  console.log('  Stack:', err.stack);
}

try {
  app.use('/api/vendors', require('./routes/vendors'));
  console.log('  ✓ Vendor routes loaded');
} catch (err) {
  console.log('  ✗ Error loading vendor routes:', err.message);
  console.log('  Stack:', err.stack);
}

try {
  app.use('/api/staff', require('./routes/staff'));
  console.log('  ✓ Staff routes loaded');
} catch (err) {
  console.log('  ✗ Error loading staff routes:', err.message);
  console.log('  Stack:', err.stack);
}

try {
  app.use('/api/inquiries', require('./routes/inquiries'));
  console.log('  ✓ Inquiry routes loaded');
} catch (err) {
  console.log('  ✗ Error loading inquiry routes:', err.message);
  console.log('  Stack:', err.stack);
}

try {
  app.use('/api/meeting-logs', require('./routes/meetingLogs'));
  console.log('  ✓ Meeting Logs routes loaded');
} catch (err) {
  console.log('  ✗ Error loading Meeting Logs routes:', err.message);
  console.log('  Stack:', err.stack);
}

try {
  app.use('/api/google-sheets', require('./routes/googleSheets'));
  console.log('  ✓ Google Sheets routes loaded');
} catch (err) {
  console.log('  ✗ Error loading Google Sheets routes:', err.message);
  console.log('  Stack:', err.stack);
}

try {
  app.use('/api/orders', require('./routes/orders'));
  console.log('  ✓ Order routes loaded');
} catch (err) {
  console.log('  ✗ Error loading order routes:', err.message);
  console.log('  Stack:', err.stack);
}

try {
  app.use('/api/tasks', require('./routes/taskRoutes'));
  console.log('  ✓ Task routes loaded');
} catch (err) {
  console.log('  ✗ Error loading task routes:', err.message);
  console.log('  Stack:', err.stack);
}

try {
  app.use('/api/customers', require('./routes/customers'));
  console.log('  ✓ Customer routes loaded');
} catch (err) {
  console.log('  ✗ Error loading customer routes:', err.message);
}

try {
  app.use('/api/products', require('./routes/products'));
  console.log('  ✓ Product routes loaded');
} catch (err) {
  console.log('  ✗ Error loading product routes:', err.message);
}

try {
  console.log('📝 Loading drawing routes...');
  app.use('/api/drawings', require('./routes/drawings'));
  console.log('  ✓ Drawing routes loaded');
} catch (err) {
  console.log('  ✗ Error loading drawing routes:', err.message);
}

// AI Chat routes
try {
  app.use('/api/ai-chat', require('./routes/aiChat'));
  console.log('  ✓ AI Chat routes loaded');
} catch (err) {
  console.log('  ✗ Error loading AI Chat routes:', err.message);
  console.log('  Stack:', err.stack);
}

// Smart Automation routes
if (smartAutomationRoutes) {
  try {
    app.use('/smart-automation', smartAutomationRoutes);
    console.log('  ✓ Smart Automation routes mounted');
  } catch (err) {
    console.log('  ✗ Error mounting Smart Automation routes:', err.message);
  }
} else {
  console.log('  ⊘ Smart Automation routes skipped (not loaded)');
}

// New Automation Routes (Suggestion-based workflow)
if (newAutomationRoutes) {
  try {
    app.use('/api/automation', newAutomationRoutes);
    console.log('  ✓ New Automation API routes mounted at /api/automation');
  } catch (err) {
    console.log('  ✗ Error mounting New Automation routes:', err.message);
  }
} else {
  console.log('  ⊘ New Automation routes skipped (not loaded)');
}

// Customer Insights routes
if (customerInsightsRoutes) {
  try {
    app.use('/api/insights', customerInsightsRoutes);
    console.log('  ✓ Customer Insights routes mounted');
  } catch (err) {
    console.log('  ✗ Error mounting Customer Insights routes:', err.message);
  }
} else {
  console.log('  ⊘ Customer Insights routes skipped (not loaded)');
}

// AI Support routes
if (aiSupportRoutes) {
  try {
    app.use('/api/ai/support', aiSupportRoutes);
    console.log('  ✓ AI Support routes mounted at /api/ai/support');
  } catch (err) {
    console.log('  ✗ Error mounting AI Support routes:', err.message);
  }
} else {
  console.log('  ⊘ AI Support routes skipped (not loaded)');
}

/*
try {
  app.use('/api/quotations', require('./routes/quotations'));
  console.log('  ✓ Quotation routes loaded');
} catch (err) {
  console.log('  ✗ Error loading quotation routes:', err.message);
}
*/

console.log('✅ All routes loaded successfully');

// Serve uploaded files
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/invoices', express.static(path.join(__dirname, 'invoices'))); // Serve invoice PDFs

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Vlite Furniture ERP API',
    version: '1.0.0',
    documentation: '/api/docs',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Export app for testing
module.exports = app;

console.log('📦 Module exported, checking if main...');
console.log('require.main === module:', require.main === module);

// Start server with clustering only if not required by another module
if (require.main === module) {
  const numCPUs = os.cpus().length;

  if (cluster.isMaster && process.env.NODE_ENV === 'production') {
    console.log(`🎯 Master process ${process.pid} is running`);
    console.log(`🚀 Spawning ${numCPUs} workers for load balancing...`);

    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
      console.log(`⚠️ Worker ${worker.process.pid} died. Spawning a replacement...`);
      cluster.fork();
    });
  } else {
    // Workers can share any TCP connection
    // In this case it is an HTTP server
    console.log(`🎯 Starting ${cluster.isMaster ? 'Single' : 'Worker'} process ${process.pid}...`);
    const PORT = process.env.PORT || 5001;
    console.log('📡 Port:', PORT);

    try {
      const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 ${cluster.isMaster ? 'Server' : 'Worker ' + process.pid} running on http://localhost:${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
        logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      });

      console.log('🔄 app.listen() called, waiting for callback...');

      server.on('error', (err) => {
        console.error('❌ Server error:', err);
        if (err.code === 'EADDRINUSE') {
          console.error(`Port ${PORT} is already in use`);
        }
      });

      // Handle SIGTERM
      process.on('SIGTERM', () => {
        logger.info('SIGTERM received, shutting down gracefully');

        // Stop background jobs (only in master or a specific worker if preferred)
        // Usually, background jobs should run in only one instance.
        // For simplicity, we keep them in all, but ideally we'd use a separate job runner.
        if (stockMonitoringJob) {
          stockMonitoringJob.stop();
          console.log('✅ Stock monitoring job stopped');
        }

        server.close(() => {
          logger.info('Process terminated');
        });
      });
    } catch (err) {
      console.error('❌ Failed to start server:', err);
    }
  }
}
