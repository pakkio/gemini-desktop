import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Convert `import.meta.url` to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(
  __dirname,
  "../src/backend/configurations/serverConfig.json"
);

export async function initializeAndGetModel() {
  try {
    const data = fs.readFileSync(configPath, "utf-8");
    if (!data) {
      return null;
    }
    const serverConfigurations = JSON.parse(data);
    const { GEMINI_API_KEY } = serverConfigurations;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const geminiModel = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction:
        "You are a powerful assistant who have access to various tools , so you carefully checks what the user wants and check if you have any tool suitable for the answer available at your end. if yes make a call to that tool and send response to the user",
    });

    return geminiModel;
  } catch (e) {
    console.log(e);
  }
}
