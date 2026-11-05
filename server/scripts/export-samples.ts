// Writes the three admin CSV reports to docs/samples/ by calling the real API in-process.
// Usage: npx tsx scripts/export-samples.ts   (uses DATABASE_URL from the environment)
import { mkdirSync, writeFileSync } from 'node:fs';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db';

const app = createApp();
const login = await request(app).post('/api/auth/login').send({ email: 'admin@pgfy.demo', password: 'Admin@123' });
if (login.status !== 200) throw new Error(`Login failed: ${login.status}`);

mkdirSync('../docs/samples', { recursive: true });
for (const [path, file] of [['leads', 'leads.csv'], ['calls', 'call-history.csv'], ['performance', 'executive-performance.csv']]) {
  const res = await request(app).get(`/api/reports/${path}`).set('Authorization', `Bearer ${login.body.token}`);
  if (res.status !== 200) throw new Error(`${path}: ${res.status}`);
  writeFileSync(`../docs/samples/${file}`, res.text);
  console.log(`docs/samples/${file}: ${res.text.trim().split('\r\n').length - 1} rows`);
}
await prisma.$disconnect();
