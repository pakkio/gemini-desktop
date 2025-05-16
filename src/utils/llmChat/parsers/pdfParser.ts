import { File as FormidableFile } from "formidable";
import { getGeminiApiKey } from "../../getGeminiApiKey";
import fs from "fs";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
export async function parsePDFFile(
  pdfFile: FormidableFile
): Promise<string | boolean> {
  if (!pdfFile.filepath || !pdfFile.mimetype) {
    return false;
  }
  const GEMINI_API_KEY = getGeminiApiKey();

  if (!GEMINI_API_KEY) {
    // Check if API key was loaded
    console.error("Google GenAI API key is missing. Cannot upload file.");
    return false;
  }
  const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
  });

  const googleUploadedFile = await ai.files.upload({
    file: pdfFile.filepath,
    config: {
      mimeType: pdfFile.mimetype,
      // displayName: audioFile.originalFilename || `uploaded-audio-${Date.now()}`
    },
  });

  const genAIResponse = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: createUserContent([
      createPartFromUri(
        googleUploadedFile.uri || "",
        googleUploadedFile.mimeType || ""
      ),
      "Please important content from the document",
    ]),
  });

  fs.unlink(pdfFile.filepath, (unlinkErr) => {
    if (unlinkErr) {
      console.warn(
        `Warning: Failed to delete temporary file ${pdfFile.filepath}:`,
        unlinkErr
      );
    } else {
      console.log(`Temporary file ${pdfFile.filepath} deleted successfully.`);
    }
  });

  return genAIResponse?.text || "";
}
