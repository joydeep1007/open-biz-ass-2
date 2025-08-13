import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config';

/**
 * Database schema type for submissions table
 */
export interface SubmissionRow {
  id: number;
  data: Record<string, unknown>; // JSON data
  created_at: string;
}

/**
 * Supabase client instance
 */
export const supabase: SupabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseKey
);

/**
 * Test Supabase connection
 */
export async function testSupabaseConnection(): Promise<void> {
  try {
    // Test connection with a simple query
    const { error } = await supabase
      .from('submissions')
      .select('count')
      .limit(1);

    if (error) {
      console.warn('⚠️ Supabase connection test warning:', error.message);
      // Don't throw error if table doesn't exist yet
      if (!error.message.includes('relation "submissions" does not exist')) {
        throw error;
      }
    }

    console.log('✅ Supabase connection successful');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    throw new Error('Failed to connect to Supabase');
  }
}

/**
 * Create a new submission record
 */
export async function createSubmission(data: Record<string, unknown>): Promise<SubmissionRow> {
  const { data: submission, error } = await supabase
    .from('submissions')
    .insert([{ data }])
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    throw new Error(`Failed to create submission: ${error.message}`);
  }

  if (!submission) {
    throw new Error('Failed to create submission: No data returned');
  }

  return submission as SubmissionRow;
}

/**
 * Get all submissions with pagination
 */
export async function getSubmissions(
  page: number = 1,
  limit: number = 10
): Promise<{ data: SubmissionRow[]; count: number }> {
  const offset = (page - 1) * limit;

  const [dataResult, countResult] = await Promise.all([
    supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
  ]);

  if (dataResult.error) {
    throw new Error(`Failed to fetch submissions: ${dataResult.error.message}`);
  }

  if (countResult.error) {
    throw new Error(`Failed to count submissions: ${countResult.error.message}`);
  }

  return {
    data: (dataResult.data as SubmissionRow[]) || [],
    count: countResult.count || 0
  };
}

/**
 * Get a specific submission by ID
 */
export async function getSubmissionById(id: number): Promise<SubmissionRow | null> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch submission: ${error.message}`);
  }

  return data as SubmissionRow;
}

/**
 * Initialize database tables (create if not exists)
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Check if submissions table exists by trying to query it
    const { error } = await supabase
      .from('submissions')
      .select('id')
      .limit(1);

    if (error && error.message.includes('relation "submissions" does not exist')) {
      console.log('📋 Creating submissions table...');
      
      // Create the table using SQL
      const { error: createError } = await supabase.rpc('create_submissions_table');
      
      if (createError) {
        console.warn('⚠️ Could not create table automatically. Please create it manually:');
        console.log(`
CREATE TABLE submissions (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
        `);
      } else {
        console.log('✅ Submissions table created successfully');
      }
    } else {
      console.log('✅ Submissions table already exists');
    }
  } catch (error) {
    console.warn('⚠️ Database initialization warning:', error);
  }
}