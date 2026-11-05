// Load server/.env when present (Node >= 20.12). Real deployments set env vars directly.
try {
  process.loadEnvFile();
} catch {
  /* no .env file — rely on the environment */
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name} (see server/.env.example)`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: '8h' as const,
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};
