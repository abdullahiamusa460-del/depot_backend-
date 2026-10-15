import { Router } from 'express';
import * as categories from '../controllers/categoryController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  idParam,
} from '../validations/schemas.js';

const router = Router();

router.use(protect);

router.get('/', categories.listCategories);
router.get('/:id', validate(idParam, 'params'), categories.getCategory);
router.post('/', authorize('admin'), validate(categoryCreateSchema), categories.createCategory);
router.put(
  '/:id',
  authorize('admin'),
  validate(idParam, 'params'),
  validate(categoryUpdateSchema),
  categories.updateCategory
);
router.delete(
  '/:id',
  authorize('admin'),
  validate(idParam, 'params'),
  categories.deleteCategory
);

export default router;
