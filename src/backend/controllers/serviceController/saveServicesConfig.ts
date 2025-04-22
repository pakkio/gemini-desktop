import fs from "fs";
import path from "path";

const configPath = path.join(__dirname, "../data/servicesConfig.json");

export const saveServicesConfig = (req:any, res:any) => {
  try {
    const data = req.body;
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save config." });
  }
};
