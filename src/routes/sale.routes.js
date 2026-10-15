import { Router } from 'express';
import * as sales from '../controllers/saleController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { saleCreateSchema, saleListQuery, idParam } from '../validations/schemas.js';

const router = Router();

router.use(protect);

router.post('/', validate(saleCreateSchema), sales.createSale);
router.get('/', validate(saleListQuery, 'query'), sales.listSales);
router.get(
  '/:id',
  validate(idParam, 'params'),
  sales.getSale
);
router.get('/invoice/:invoiceNumber', sales.getSaleByInvoice);

export default router;
