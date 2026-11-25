import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER;
const password = process.env.SQL_ADMIN_PASSWORD;
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

let dbCredentials:
  | { host: string; user: string; password: string; database: string; ssl: false }
  | { url: string };

function ensureNeonSsl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (!isLocal && !parsed.searchParams.has('sslmode')) {
      parsed.searchParams.set('sslmode', 'require');
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

if (sqlHost) {
  if (!sqlDbName || !user || !password) {
    throw new Error(
      'When SQL_HOST is set, SQL_DB_NAME, SQL_ADMIN_USER, and SQL_ADMIN_PASSWORD must also be set.'
    );
  }
  dbCredentials = {
    host: sqlHost,
    user,
    password,
    database: sqlDbName,
    ssl: false,
  };
} else if (databaseUrl) {
  dbCredentials = {
    url: ensureNeonSsl(databaseUrl),
  };
} else {
  throw new Error(
    'Database credentials missing. Set DATABASE_URL (for Neon/PostgreSQL) or SQL_HOST, SQL_DB_NAME, SQL_ADMIN_USER, and SQL_ADMIN_PASSWORD.'
  );
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  schemaFilter: ['public'],
  dbCredentials,
  verbose: true,
});
