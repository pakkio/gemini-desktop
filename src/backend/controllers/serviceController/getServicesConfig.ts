import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Convert `import.meta.url` to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, "../src/backend/configurations/mcpServicesConfig.json");

export const getServicesConfig = (req:any, res:any) => {
  try {
    const data = fs.readFileSync(configPath, "utf-8");
    if (!data) {
      return res.status(400).json({ error: "No data saved yet" });
    }
    return res.json(JSON.parse(data));
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: "Failed to read config." });
  }
};
