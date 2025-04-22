import express from "express";
import serviceRoutes from "./mcpServiceConfig/mcpServiceConfig.ts";
import llmRoutes from "./llmChat/llmChat.ts";
import serverConfigRoutes from "./serverConfiguration/serverConfiguration.ts";

const router = express.Router();

router.use("/services", serviceRoutes);
router.use("/chat", llmRoutes);
router.use("/server-config", serverConfigRoutes);

export default router;
