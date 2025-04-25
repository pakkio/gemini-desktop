
import { app } from "electron";


export const getHomePath = (_: any, res: any) => {
  try {
    return res.json({path:app.getPath('home')});
  } catch (err: any) {
    console.log(err);
    res.status(500).json({ error: "Failed to read config.", message: err.message });
  }
};
