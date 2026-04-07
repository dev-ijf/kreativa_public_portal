import { neon } from '@neondatabase/serverless';

// Ensure DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set in environment variables");
}

// Ensure HTTP driver is used for Neon connection pool
export const sql = neon(process.env.DATABASE_URL);
