import {
    GoogleGenerativeAI
} from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in .env file");
 }
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash",systemInstruction:"You are a powerful assistant who have access to various tools , so you carefully checks what the user wants and check if you have any tool suitable for the answer available at your end. if yes make a call to that tool and send response to the user", });

export default geminiModel;