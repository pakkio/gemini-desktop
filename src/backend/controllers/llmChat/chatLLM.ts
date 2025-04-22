import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, "../src/backend/data/servicesConfig.json");

export const chatWithLLM = (req:any, res:any) => {
  try {
    const data = fs.readFileSync(configPath, "utf-8");
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: "Failed to read config." });
  }
};
