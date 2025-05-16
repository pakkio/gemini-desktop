import { File as FormidableFile } from "formidable";
import PptxParser from "node-pptx-parser";

export async function parsePptFile(
  file: FormidableFile | undefined
): Promise<string | boolean> {
  if (!file || !file.filepath) {
    // Ensure file and filepath exist
    console.error("No file or file path provided for parsing.");
    return false;
  }

  console.log(
    `Attempting to parse file: ${file.originalFilename}, temp path: ${file.filepath}`
  );

  try {
    const parser = new PptxParser(file.filepath);
    const textContent = await parser.extractText();
    let content = "";
    textContent.forEach((slide) => {
      content += slide.text.join("\n") + "\n\n"; // Join slide text with new lines
    });
    return content;
  } catch (mammothError) {
    console.error(
      `Error parsing PPTX file ${file.originalFilename} with mammoth:`,
      mammothError // Log the actual error object
    );
    return false;
  }
}
