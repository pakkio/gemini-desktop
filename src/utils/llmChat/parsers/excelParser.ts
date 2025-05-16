import { File as FormidableFile } from "formidable";
import * as XLSX from 'xlsx';
import fs from 'node:fs'; // Import the 'fs' module

export async function parseExcelFile(file: FormidableFile | undefined): Promise<string | boolean> {
  try {
    if (!file || !file.filepath) { // Added check for file.filepath
      console.error("No file or file path provided for parsing.");
      return false;
    }

    console.log(`Attempting to parse Excel file: ${file.originalFilename}, temp path: ${file.filepath}`);

    // 1. Read the temporary file into a buffer
    const fileBuffer = fs.readFileSync(file.filepath);

    // 2. Use XLSX.read() with the buffer
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    let fullText = "";
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: "" });
      sheetData.forEach((row: any[]) => {
        fullText += row.join(" ").trim() + "\n"; // Trim row result before adding newline
      });
      if (workbook.SheetNames.length > 1 && workbook.SheetNames.indexOf(sheetName) < workbook.SheetNames.length -1) {
        // Add separator only if there are more sheets to come
        fullText += `\n--- End of Sheet: ${sheetName} ---\n\n`;
      }
    });

    const trimmedFullText = fullText.trim();
    if (trimmedFullText === "") {
        console.warn(`XLSX parsing resulted in empty text for ${file.originalFilename}. The file might be empty or contain non-textual data.`);
    } else {
        console.log(`XLSX parsing successful for ${file.originalFilename}.`);
    }
    return trimmedFullText;

  } catch (error) {
    console.error(`Error parsing Excel file ${file?.originalFilename || 'unknown'}:`, error);
    return false;
  }
}