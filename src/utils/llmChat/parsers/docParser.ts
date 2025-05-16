import { File as FormidableFile } from "formidable";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const textract = require("textract");

export async function parseDocFile(file: FormidableFile| undefined): Promise<string | boolean> {
    if(!file){
        console.error("No file provided for parsing.");
        return false;
      }
    return new Promise((resolve) => {
      textract.fromFileWithPath(file.filepath, { preserveLineBreaks: true }, (error: Error | null, text: string) => {
        if (error) {
          console.error(`Error parsing DOC file ${file.originalFilename} with textract:`, error);
          console.warn("Ensure 'antiword' or 'catdoc' is installed and in your system's PATH for .doc parsing with textract.");
          resolve(false);
        } else {
          resolve(text);
        }
      });
    });
  }