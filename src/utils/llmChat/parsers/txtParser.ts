import fs from 'fs/promises';
import { File as FormidableFile } from "formidable";


export async function parseTextFile(file: FormidableFile | undefined): Promise<string | boolean> {
  try {
    if(!file){
      console.error("No file provided for parsing.");
      return false;
    }
    const content = await fs.readFile(file.filepath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`Error parsing TXT file `, error);
    return false;
  }
}