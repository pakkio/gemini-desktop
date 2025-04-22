import { Router } from 'express';
import { getServicesConfig } from '../../controllers/serviceController/getServicesConfig';
import { saveServicesConfig } from '../../controllers/serviceController/saveServicesConfig';

const router = Router();

router.post("/", getServicesConfig);

export default router;
