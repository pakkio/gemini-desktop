import { Router } from "express";
import { getServerConfiguration } from "../../controllers/serverConfiguration/getServerConfiguration";
import { saveServerConfiguration } from "../../controllers/serverConfiguration/saveServerConfiguration";

const router = Router();

router.get("/", getServerConfiguration);
router.post("/", saveServerConfiguration);

export default router;
