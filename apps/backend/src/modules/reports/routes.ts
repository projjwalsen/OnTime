import { Router } from 'express';
import {
  getCustomerOverallPurchaseHistory,
  getCustomerProductPurchaseHistory,
} from './controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/purchase-history/overall/:organisationId', getCustomerOverallPurchaseHistory);
router.get('/purchase-history/product-wise/:organisationId', getCustomerProductPurchaseHistory);

export default router;

