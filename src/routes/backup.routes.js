import { Router } from 'express';
import * as backup from '../controllers/backupController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/export', backup.exportBackup);
router.post('/restore', backup.restoreBackup);

export default router;
