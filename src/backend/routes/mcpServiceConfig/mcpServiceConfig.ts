import { Router } from 'express';
import { getServicesConfig } from '../../controllers/mcpServiceController/getMcpServicesConfig';
import { saveServicesConfig } from '../../controllers/mcpServiceController/saveMcpServicesConfig';

const router = Router();

router.get("/get", getServicesConfig);
router.post("/save", saveServicesConfig);

export default router;
