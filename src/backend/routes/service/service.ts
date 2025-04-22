import { Router } from 'express';
import { getServicesConfig } from '../../controllers/serviceController/getServicesConfig';
import { saveServicesConfig } from '../../controllers/serviceController/saveServicesConfig';

const router = Router();

router.get("/get", getServicesConfig);
router.post("/save", saveServicesConfig);

export default router;
