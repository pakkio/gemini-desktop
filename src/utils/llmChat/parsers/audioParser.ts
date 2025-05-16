import { File as FormidableFile } from "formidable";
import { getGeminiApiKey } from "../../getGeminiApiKey";
import fs from "fs";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
export async function parseAudioFile(
  audioFile: FormidableFile
): Promise<string | boolean> {
  if (!audioFile.filepath || !audioFile.mimetype) {
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
    file: audioFile.filepath,
    config: {
      mimeType: audioFile.mimetype,
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
      "Please transcribe the audio.and provide the entire important context of the audio file",
    ]),
  });

  fs.unlink(audioFile.filepath, (unlinkErr) => {
    if (unlinkErr) {
      console.warn(
        `Warning: Failed to delete temporary file ${audioFile.filepath}:`,
        unlinkErr
      );
    } else {
      console.log(`Temporary file ${audioFile.filepath} deleted successfully.`);
    }
  });

  return genAIResponse?.text || "";
}
