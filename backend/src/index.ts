import { createApp } from './app';
import { config, validateConfig } from './config';
import { testDatabaseConnection, disconnectDatabase } from './db';
import { loadSchema } from './schemaLoader';

/**
 * Bootstrap the server
 */
async function bootstrap(): Promise<void> {
  try {
    console.log('🚀 Starting Udyam Registration API Server...');
    console.log('=' .repeat(50));
    
    // 1. Validate configuration
    validateConfig();
    
    // 2. Test database connection
    await testDatabaseConnection();
    
    // 3. Load schema from file
    await loadSchema(config.schemaPath);
    
    // 4. Create Express app
    const app = createApp();
    
    // 5. Start server
    const server = app.listen(config.port, () => {
      console.log('=' .repeat(50));
      console.log('🎉 Server started successfully!');
      console.log(`📡 Server running on http://localhost:${config.port}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log('');
      console.log('📋 Available endpoints:');
      console.log(`   GET  http://localhost:${config.port}/`);
      console.log(`   GET  http://localhost:${config.port}/schema`);
      console.log(`   POST http://localhost:${config.port}/validate`);
      console.log(`   POST http://localhost:${config.port}/submit`);
      console.log(`   GET  http://localhost:${config.port}/submissions`);
      console.log('=' .repeat(50));
    });
    
    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('📡 HTTP server closed');
        
        try {
          await disconnectDatabase();
          console.log('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('⏰ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
bootstrap();