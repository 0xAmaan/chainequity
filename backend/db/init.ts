#!/usr/bin/env bun
/**
 * Database Initialization Script
 * Creates the chain_equity database and applies schema
 */
import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";

// Bun automatically loads .env files from backend/.env

const DB_NAME = process.env.DB_NAME || "chain_equity";
const DB_USER = process.env.DB_USER || "postgres";
const DB_PASSWORD = process.env.DB_PASSWORD || "postgres";
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = parseInt(process.env.DB_PORT || "5432");

const initDatabase = async () => {
  console.log("🗄️  ChainEquity Database Initialization\n");

  // Connect to postgres database to create chain_equity database
  const adminClient = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: "postgres",
  });

  try {
    await adminClient.connect();
    console.log("✅ Connected to PostgreSQL server");

    // Check if database exists
    const dbCheckResult = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [DB_NAME],
    );

    if (dbCheckResult.rows.length === 0) {
      // Create database
      await adminClient.query(`CREATE DATABASE ${DB_NAME}`);
      console.log(`✅ Created database: ${DB_NAME}`);
    } else {
      console.log(`ℹ️  Database ${DB_NAME} already exists`);
    }

    await adminClient.end();

    // Connect to chain_equity database to apply schema
    const client = new Client({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
    });

    await client.connect();
    console.log(`✅ Connected to database: ${DB_NAME}`);

    // Read and execute schema
    const schemaPath = join(__dirname, "schema.sql");
    const schema = readFileSync(schemaPath, "utf-8");

    await client.query(schema);
    console.log("✅ Applied database schema");

    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log("\n📋 Created tables:");
    tablesResult.rows.forEach((row) => {
      console.log(`   - ${row.table_name}`);
    });

    // Verify views were created
    const viewsResult = await client.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (viewsResult.rows.length > 0) {
      console.log("\n👁️  Created views:");
      viewsResult.rows.forEach((row) => {
        console.log(`   - ${row.table_name}`);
      });
    }

    await client.end();
    console.log("\n✅ Database initialization complete!\n");
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    process.exit(1);
  }
};

// Run initialization
initDatabase();
