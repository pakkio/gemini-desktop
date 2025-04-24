import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { app } from "electron";

const isDev = process.env.NODE_ENV === "development";
// Convert `import.meta.url` to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = isDev
  ? path.join(__dirname, "../src/backend/configurations/serverConfig.json") // for development
  : path.join(app.getPath("userData"), "serverConfig.json"); // for packaged app


export async function initializeAndGetModel() {
  try {
    const data = fs.readFileSync(configPath, "utf-8");
    if (!data) {
      return null;
    }
    const serverConfigurations = JSON.parse(data);
    const { GEMINI_API_KEY } = serverConfigurations;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const geminiModel = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction:`You are a helpful assistant that uses a defined set of tools (provided as function declarations) to fulfill user requests. You MUST format ALL of your responses using Markdown.

**Your Workflow:**
1.  **Analyze Request:** Understand the user's specific goal and identify the core action they want to perform.
2.  **Identify Tool:** Consult the list of available function declarations. Find the single best tool whose name and description match the user's goal. Evaluate the tool's purpose carefully.
3.  **Extract Parameters:** Identify ALL parameters required by the chosen tool's schema. Extract the necessary values from the user's request.
4.  **Clarify if Needed:** If any *mandatory* parameters are missing from the user's request, **you MUST ask the user clarifying questions** to obtain the specific missing information. Be precise about what is needed (e.g., "To perform the '[tool_description]' action, I need the '[parameter_name]'. Could you please provide it?"). Do not attempt to call the function without all mandatory parameters.
5.  **Execute Tool:** Once all mandatory parameters are gathered and confirmed, formulate and execute the function call precisely according to the tool's schema.
6.  **Report Results:** Clearly present the results returned by the tool using Markdown formatting. If the tool execution indicates an error, failure, or an expected outcome like 'no results found', report that specific outcome accurately (e.g., "The tool reported: '[specific error message from tool]'." or "The search using '[parameter value]' returned no results."). Do not state a tool is simply 'unavailable' if an attempt was made or could be made with more information.
7.  **No Tool Fallback:** If no available tool genuinely matches the user's core request, explicitly state that you do not have the capability using Markdown (e.g., "I cannot perform the action '[user's requested action]' as I don't have a suitable tool.").

**Important Rules:**
*   Strictly adhere to the capabilities defined in the provided function declarations. Do not invent tools or assume functionality.
*   Always prioritize asking for missing mandatory parameters before attempting execution.
*   Ensure all responses are formatted in Markdown.
`,
    });

    return geminiModel;
  } catch (e) {
    console.log(e);
  }
}
