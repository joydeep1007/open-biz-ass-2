import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import formRoutes from './routes/form';

/**
 * Create and configure Express application
 */
export function createApp(): express.Application {
  const app = express();

  // Trust proxy for accurate IP addresses in logs
  app.set('trust proxy', 1);

  // CORS configuration
  app.use(cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173', // Vite default port
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5173'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Request logging
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // Body parsing middleware
  app.use(express.json({
    limit: '10mb',
    strict: true
  }));

  app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
  }));

  // Health check endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Udyam Registration API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // API routes
  app.use('/', formRoutes);

  // 404 handler
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      message: `${req.method} ${req.originalUrl} is not a valid endpoint`,
      availableEndpoints: [
        'GET /',
        'GET /schema',
        'POST /validate',
        'POST /submit',
        'GET /submissions',
        'GET /submissions/:id'
      ]
    });
  });

  // Global error handler
  app.use((error: Error, _req: Request, res: Response, _next: NextFunction): void => {
    console.error('Unhandled error:', error);

    // Handle specific error types
    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
      return;
    }

    if (error.name === 'SyntaxError' && 'body' in error) {
      res.status(400).json({
        success: false,
        error: 'Invalid JSON',
        message: 'Request body contains invalid JSON'
      });
      return;
    }

    // Generic error response
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  });

  return app;
}

/**
 * Request logging middleware for debugging
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('📝 Request:', JSON.stringify(logData, null, 2));
    }
  });

  next();
}