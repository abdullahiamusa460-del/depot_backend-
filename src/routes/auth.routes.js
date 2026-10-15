import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as auth from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateUserSchema,
  idParam,
} from '../validations/schemas.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, try again later' },
});

router.post('/register', validate(registerSchema), auth.register);
router.post('/login', loginLimiter, validate(loginSchema), auth.login);
router.get('/me', protect, auth.me);
router.put('/me/password', protect, validate(changePasswordSchema), auth.changePassword);

router.get('/users', protect, authorize('admin'), auth.listUsers);
router.put(
  '/users/:id',
  protect,
  authorize('admin'),
  validate(idParam, 'params'),
  validate(updateUserSchema),
  auth.updateUser
);

export default router;
