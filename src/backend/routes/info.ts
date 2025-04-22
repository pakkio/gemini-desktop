import { Router } from 'express';
import { getInfo } from '../controllers/info';
import { getServicesConfig } from '../controllers/serviceController/getServicesConfig';
import { saveServicesConfig } from '../controllers/serviceController/saveServicesConfig';

const router = Router();

router.get('/', getInfo);
router.post("/services/get", getServicesConfig);
router.post("/services/save", saveServicesConfig);

export default router;
