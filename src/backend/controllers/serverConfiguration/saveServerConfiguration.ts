import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(
  __dirname,
  "../src/backend/configurations/serverConfig.json"
);

export const saveServerConfiguration = (req: any, res: any) => {
  try {
    const data = req.body;
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
    return res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to save config." });
  }
};
