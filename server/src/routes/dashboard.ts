import { Router } from 'express';
import { adminDashboard, executiveDashboard } from '../lib/metrics';
import { currentUser } from '../middleware/auth';

const router = Router();

// GET /api/dashboard — shape depends on the caller's role (see docs/API_CONTRACT.md).
router.get('/', async (req, res) => {
  const user = currentUser(req);
  res.json(user.role === 'ADMIN' ? await adminDashboard() : await executiveDashboard(user.id));
});

export default router;
