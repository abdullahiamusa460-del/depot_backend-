import { Router } from 'express';
import * as settings from '../controllers/settingController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { settingsUpdateSchema } from '../validations/schemas.js';

const router = Router();

router.use(protect);

router.get('/', settings.getSettings);
router.put('/', authorize('admin'), validate(settingsUpdateSchema), settings.updateSettings);

export default router;
