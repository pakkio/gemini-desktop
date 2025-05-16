import { File as FormidableFile } from "formidable";
import { getGeminiApiKey } from "../../getGeminiApiKey";
import fs from "fs";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
export async function parseImageFile(
  imageFile: FormidableFile
): Promise<string | boolean> {
  if (!imageFile.filepath || !imageFile.mimetype) {
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

  let googleUploadedFile = await ai.files.upload({
    file: imageFile.filepath,
    config: {
      mimeType: imageFile.mimetype,
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
      "Tell me what you see in the image and provide the entire important context of the image",
    ]),
  });

  fs.unlink(imageFile.filepath, (unlinkErr) => {
    if (unlinkErr) {
      console.warn(
        `Warning: Failed to delete temporary file ${imageFile.filepath}:`,
        unlinkErr
      );
    } else {
      console.log(`Temporary file ${imageFile.filepath} deleted successfully.`);
    }
  });

  return genAIResponse?.text || "";
}
