import { Router } from 'express';
import { getServicesConfig } from '../../controllers/mcpServiceController/getMcpServicesConfig';
import { saveServicesConfig } from '../../controllers/mcpServiceController/saveMcpServicesConfig';
import { getHomePath } from '../../controllers/mcpServiceController/getHomeRoute';

const router = Router();

router.get("/get", getServicesConfig);
router.post("/save", saveServicesConfig);
router.get("/home-route", getHomePath);

export default router;
