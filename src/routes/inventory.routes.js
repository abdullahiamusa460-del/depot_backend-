import { Router } from 'express';
import * as inventory from '../controllers/inventoryController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  stockAdjustSchema,
  inventoryListQuery,
  transactionListQuery,
} from '../validations/schemas.js';

const router = Router();

router.use(protect);

router.get('/', validate(inventoryListQuery, 'query'), inventory.listInventory);
router.post('/adjust', validate(stockAdjustSchema), inventory.adjustStock);
router.get('/transactions', validate(transactionListQuery, 'query'), inventory.listTransactions);

export default router;
