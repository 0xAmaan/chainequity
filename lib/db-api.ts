import { Pool } from "pg";

// Create a connection pool for API routes
// This is separate from the backend CLI/indexer connection
let pool: Pool | null = null;

export const getPool = () => {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "chain_equity",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
};

// Helper to execute queries
export const query = async (text: string, params?: any[]) => {
  const pool = getPool();
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("Executed query", { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
};

// Clean up pool on process exit
if (typeof process !== "undefined") {
  process.on("SIGTERM", async () => {
    if (pool) {
      await pool.end();
    }
  });
}
