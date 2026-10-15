import { Router } from 'express';
import * as reports from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/sales', reports.salesReport);
router.get('/sales/daily', reports.dailySalesReport);
router.get('/products/best-selling', reports.bestSellingProducts);
router.get('/products/slow-moving', reports.slowMovingProducts);
router.get('/payments', reports.paymentReport);
router.get('/inventory', reports.inventoryReport);

export default router;
