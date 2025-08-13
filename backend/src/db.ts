import { PrismaClient } from '@prisma/client';
import { testSupabaseConnection, initializeDatabase } from './supabase';

/**
 * Prisma client instance for database operations (legacy support)
 */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

/**
 * Test database connection (now uses Supabase)
 */
export async function testDatabaseConnection(): Promise<void> {
  try {
    // Test Supabase connection
    await testSupabaseConnection();
    
    // Initialize database tables
    await initializeDatabase();
    
    console.log('✅ Database setup completed');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw new Error('Failed to connect to database');
  }
}

/**
 * Gracefully disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('📦 Database connection closed');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});