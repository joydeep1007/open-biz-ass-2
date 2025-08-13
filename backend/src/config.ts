import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export interface Config {
    port: number;
    databaseUrl: string;
    supabaseUrl: string;
    supabaseKey: string;
    schemaPath: string;
    nodeEnv: string;
    logLevel: string;
}

/**
 * Application configuration loaded from environment variables
 */
export const config: Config = {
    port: parseInt(process.env.PORT || '8000', 10),
    databaseUrl: process.env.DATABASE_URL || '',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_KEY || '',
    schemaPath: process.env.SCHEMA_PATH || '../scraped/real_credentials_schema.json',
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
};

/**
 * Validate required configuration
 */
export function validateConfig(): void {
    const requiredVars = ['SUPABASE_URL', 'SUPABASE_KEY'];
    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Resolve schema path relative to backend directory
    config.schemaPath = path.resolve(__dirname, '..', config.schemaPath);

    console.log('✅ Configuration loaded successfully');
    console.log(`   Port: ${config.port}`);
    console.log(`   Supabase URL: ${config.supabaseUrl}`);
    console.log(`   Schema Path: ${config.schemaPath}`);
    console.log(`   Environment: ${config.nodeEnv}`);
}