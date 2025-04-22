import { Router } from 'express';
import { chatWithLLM } from '../../controllers/llmChat/chatLLM';

const router = Router();

router.post("/", chatWithLLM);

export default router;
