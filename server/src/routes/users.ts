import { Router } from 'express';
import { prisma } from '../db';
import { requireRole } from '../middleware/auth';

const router = Router();

router.get('/executives', requireRole('ADMIN'), async (_req, res) => {
  const executives = await prisma.user.findMany({
    where: { role: 'SALES_EXECUTIVE' },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
  res.json({ executives });
});

export default router;
