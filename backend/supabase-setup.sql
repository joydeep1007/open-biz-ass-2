-- Create submissions table in Supabase
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on created_at for better query performance
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);

-- Create an index on the JSONB data for better search performance (optional)
CREATE INDEX IF NOT EXISTS idx_submissions_data_gin ON submissions USING GIN (data);

-- Enable Row Level Security (RLS) for better security
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for authenticated users
-- Adjust this policy based on your security requirements
CREATE POLICY "Allow all operations for authenticated users" ON submissions
  FOR ALL USING (auth.role() = 'authenticated');

-- Or create a more permissive policy for development (remove in production)
CREATE POLICY "Allow all operations for anon users" ON submissions
  FOR ALL USING (true);

-- Grant necessary permissions
GRANT ALL ON submissions TO anon;
GRANT ALL ON submissions TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE submissions_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE submissions_id_seq TO authenticated;