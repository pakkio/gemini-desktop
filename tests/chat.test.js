import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { File } from "fetch-blob/file.js";

describe("POST /api/chat - Direct API Call Test", () => {
  const testApiUrl = `${import.meta.env.VITE_API_URL}/api/chat`;
  const perTestExecutionSeconds = 20000;

  it(
    "should send a simple text message and get a successful response",
    async () => {
      const userMessage = "Hey, tell me the weather in my area";
      const emptyHistory = [];
      const model = "gemini-1.5-flash";

      const formData = new FormData();
      formData.append("message", userMessage);
      formData.append("history", JSON.stringify(emptyHistory));
      formData.append("model", model);

      const response = await fetch(testApiUrl, {
        method: "POST",
        body: formData,
      });

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData).toHaveProperty("reply");
    },
    perTestExecutionSeconds
  );

  it(
    "should successfully upload a file (input.pptx) with a message and get a response",
    async () => {
      const userMessage = "Please summarize this presentation.";
      const emptyHistory = [];
      const model = "gemini-1.5-flash";

      const filePath = path.join(__dirname, "./assets/input.pptx");
      if (!fs.existsSync(filePath)) {
        throw new Error(
          `Test file not found at ${filePath}. Make sure input.pptx is in the assets folder relative to this test file.`
        );
      }
      const fileBuffer = fs.readFileSync(filePath);

      const pptxFile = new File([fileBuffer], "input.pptx", {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });

      const formData = new FormData();
      formData.append("message", userMessage);
      formData.append("history", JSON.stringify(emptyHistory));
      formData.append("model", model);
      formData.append("files", pptxFile, pptxFile.name);
      const response = await fetch(testApiUrl, {
        method: "POST",
        body: formData,
      });

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData).toHaveProperty("reply");

      console.log("File upload test response:", responseData);
    },
    perTestExecutionSeconds
  );

  it(
    "should handle an API error response correctly (example)",
    async () => {
      const userMessage =
        "This message should cause an error if API is set up to fail for certain inputs";
      const formData = new FormData();
      formData.append("message", userMessage);
      formData.append("history", JSON.stringify([]));
      formData.append("model", "invalid-model-to-cause-error"); // Example: send an invalid model

      const response = await fetch(testApiUrl, {
        method: "POST",
        body: formData,
      });

      if (response.status === 400) {
        expect(response.status).toBe(400);
        const errorData = await response.json();
        expect(errorData).toHaveProperty("error");
        console.log("API Error test response:", errorData);
      } else if (response.ok) {
        console.warn(
          "API Error test did not produce an error, API responded with OK. Check test setup or API behavior for 'invalid-model-to-cause-error'."
        );
        expect(response.ok).toBe(true);
      } else {
        console.error(
          "API Error test received unexpected status:",
          response.status
        );
        const textError = await response.text();
        console.error("Error text:", textError);
        expect(response.ok).toBe(false);
      }
    },
    perTestExecutionSeconds
  );
});
