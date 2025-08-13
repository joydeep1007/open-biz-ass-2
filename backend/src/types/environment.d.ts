declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT?: string;
      DATABASE_URL?: string;
      SUPABASE_URL: string;
      SUPABASE_KEY: string;
      SCHEMA_PATH?: string;
      LOG_LEVEL?: string;
    }
  }
}

export {};