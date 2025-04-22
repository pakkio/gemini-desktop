
import express from 'express';
import serviceRoutes from './mcpServiceConfig/mcpServiceConfig.ts';
import llmRoutes from './llmChat/llmChat.ts';

const router = express.Router();

/**
 * Mounts authentication-related routes under the '/auth' path.
 * All routes defined in AuthRoutes will be prefixed with '/auth'.
 * @example
 * // If an endpoint is defined as /login in AuthRoutes, it will be accessible at /api/v1/auth/login
 */
router.use('/services', serviceRoutes);
router.use('/chat', llmRoutes);

export default router;
