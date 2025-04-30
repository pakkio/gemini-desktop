import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { app } from "electron";

const isDev = process.env.NODE_ENV === "development";
// Convert `import.meta.url` to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = isDev
  ? path.join(__dirname, "../src/backend/configurations/serverConfig.json") // for development
  : path.join(app.getPath("userData"), "serverConfig.json"); // for packaged app


export async function initializeAndGetModel(model: string) {
  try {
    const data = fs.readFileSync(configPath, "utf-8");
    if (!data) {
      return null;
    }
    const serverConfigurations = JSON.parse(data);
    const { GEMINI_API_KEY } = serverConfigurations;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const geminiModel = genAI.getGenerativeModel({
      model: model,
      systemInstruction:`
      You are expert assistant who makes full utilization of the available tools and make sure user gets what he requested for. You try to fulfill the request completely on your own by using various available tools. You always answer in **Markdown**.
      1. user sends request.
      2. you check for suitable tools to fulfill user request. if required call multiple tools to fulfill user request.
      3. Make user interaction as less as possiible for solving user query.
      4. Always reply in Markdown.
`,
    });

    return geminiModel;
  } catch (e) {
    console.log(e);
  }
}
