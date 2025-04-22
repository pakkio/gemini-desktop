import fs from "fs";
import path from "path";

const configPath = path.join(__dirname, "../data/servicesConfig.json");

export const getServicesConfig = (req:any, res:any) => {
  try {
    const data = fs.readFileSync(configPath, "utf-8");
    if(!data){
        return res.status(400).json({ error: "No data saved yet" });
    }
   return res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: "Failed to read config." });
  }
};
