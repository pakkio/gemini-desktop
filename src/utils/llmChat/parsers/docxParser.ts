import { File as FormidableFile } from "formidable";
import mammoth from 'mammoth';

export async function parseDocxFile(file: FormidableFile | undefined): Promise<string | boolean> {
    try {
      if(!file){
        console.error("No file provided for parsing.");
        return false;
      }
      const result = await mammoth.extractRawText({ path: file.filepath });
      return result.value; 
    } catch (error) {
      console.error(`Error parsing DOCX file :`, error);
      return false;
    }
  }