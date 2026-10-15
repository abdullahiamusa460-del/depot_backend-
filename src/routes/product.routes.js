import { Router } from 'express';
import * as products from '../controllers/productController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  productCreateSchema,
  productUpdateSchema,
  productListQuery,
  idParam,
} from '../validations/schemas.js';

const router = Router();

router.use(protect);

router.get('/', validate(productListQuery, 'query'), products.listProducts);
router.get('/:id', validate(idParam, 'params'), products.getProduct);
router.post('/', authorize('admin'), validate(productCreateSchema), products.createProduct);
router.put(
  '/:id',
  authorize('admin'),
  validate(idParam, 'params'),
  validate(productUpdateSchema),
  products.updateProduct
);
router.delete(
  '/:id',
  authorize('admin'),
  validate(idParam, 'params'),
  products.deleteProduct
);

export default router;
