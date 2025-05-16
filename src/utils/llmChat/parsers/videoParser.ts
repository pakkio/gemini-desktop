import { File as FormidableFile } from "formidable";
import { getGeminiApiKey } from "../../getGeminiApiKey";
import fs from "fs";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
export async function parseVideoFile(
  videoFile: FormidableFile
): Promise<string | boolean> {
  if (!videoFile.filepath || !videoFile.mimetype) {
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
    file: videoFile.filepath,
    config: {
      mimeType: videoFile.mimetype,
      // displayName: audioFile.originalFilename || `uploaded-audio-${Date.now()}`
    },
  });
  while (!googleUploadedFile.state || googleUploadedFile.state.toString() !== 'ACTIVE') {
    await new Promise(res => setTimeout(res, 5000));
    googleUploadedFile = await ai.files.get({name: googleUploadedFile.name ?? ''});
  }
  const genAIResponse = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: createUserContent([
      createPartFromUri(
        googleUploadedFile.uri || "",
        googleUploadedFile.mimeType || ""
      ),
      "Please transcribe the video.and provide the entire important context of the file",
    ]),
  });

  fs.unlink(videoFile.filepath, (unlinkErr) => {
    if (unlinkErr) {
      console.warn(
        `Warning: Failed to delete temporary file ${videoFile.filepath}:`,
        unlinkErr
      );
    } else {
      console.log(`Temporary file ${videoFile.filepath} deleted successfully.`);
    }
  });

  return genAIResponse?.text || "";
}
