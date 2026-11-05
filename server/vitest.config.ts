import { defineConfig } from 'vitest/config';

// Tests run against a SEPARATE database (pgfy_crm_test) so they never touch demo data.
const TEST_DB = 'postgresql://pgfy:pgfy_local_dev@localhost:5432/pgfy_crm_test?schema=public';

export default defineConfig({
  test: {
    env: { DATABASE_URL: TEST_DB, JWT_SECRET: 'test-only-secret-not-used-anywhere-else' },
    globalSetup: ['tests/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 120000,
  },
});
