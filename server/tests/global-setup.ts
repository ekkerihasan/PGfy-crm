import { execSync } from 'node:child_process';

// Prepares the dedicated test database (pgfy_crm_test), never the demo DB:
// apply migrations (non-destructive) then run the seed, which recreates the fictional demo rows.
export default function setup() {
  const env = {
    ...process.env,
    DATABASE_URL: 'postgresql://pgfy:pgfy_local_dev@localhost:5432/pgfy_crm_test?schema=public',
  };
  execSync('npx prisma migrate deploy', { env, stdio: 'inherit' });
  execSync('npx prisma db seed', { env, stdio: 'inherit' });
}
