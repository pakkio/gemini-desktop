// --- START OF FILE chatLLM.ts ---

import {
  Content,
  Part,
  FunctionCall,
  GenerateContentResponse,
} from "@google/generative-ai";
import { connectToMcpServers } from "../../../utils/llmChat/getMcpTools";
import { initializeAndGetModel } from "../../../llm/gemini";

// --- Helper function for delay ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Retry configuration ---
const MCP_TOOL_MAX_RETRIES = 3; // Number of retries *after* the initial attempt
const MCP_TOOL_RETRY_DELAY_MS = 1000; // Delay between retries in milliseconds (e.g., 1 second)
const TOTAL_ATTEMPTS = 1 + MCP_TOOL_MAX_RETRIES; // Total number of attempts

export const chatWithLLM = async (req: any, res: any) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const { allGeminiTools, mcpClients, toolToServerMap } = await connectToMcpServers();

    console.log(
      "Tools configured for Gemini:",
      allGeminiTools.map(t => t.name)
    );
    console.log("Connected MCP Clients:", Array.from(mcpClients.keys()));
    console.log("Tool to Server Map:", Object.fromEntries(toolToServerMap)); // Log the map for easier debugging


    if (mcpClients.size === 0) {
      res.status(503).json({ error: "No MCP Servers are connected", allGeminiTools, mcpClients, toolToServerMap });
      return;
    }
    const geminiModel = await initializeAndGetModel();
    if (!geminiModel) {
      res.status(503).json({ error: "Server LLM not configured" });
      return;
    }
    const chat = geminiModel.startChat({
      history: (history || []) as Content[],
      tools:
        allGeminiTools.length > 0
          ? [{ functionDeclarations: allGeminiTools }]
          : undefined,
    });

    let result = await chat.sendMessage(message);
    let response: GenerateContentResponse | undefined = result.response;

    let currentContent: Content | undefined =
      response?.candidates?.[0]?.content;
    let functionCallsToProcess: FunctionCall[] | undefined =
      currentContent?.parts
        ?.filter((part: Part) => !!part.functionCall)
        .map((part: Part) => part.functionCall as FunctionCall);

    while (functionCallsToProcess && functionCallsToProcess.length > 0) {
      console.log(
        `Gemini requested ${functionCallsToProcess.length} tool call(s):`,
        functionCallsToProcess.map((c) => c.name)
      );

      const functionResponses: Part[] = [];

      // Use Promise.all to process tool calls concurrently (optional, but can speed things up)
      await Promise.all(functionCallsToProcess.map(async (call) => {
        const toolName = call.name;
        const toolArgs = call.args;
        const serverKey = toolToServerMap.get(toolName);
        const targetClient = serverKey ? mcpClients.get(serverKey) : undefined;

        if (!targetClient) {
          console.error(
            `❌ Tool "${toolName}" requested by Gemini, but no connected MCP client provides it or the client is down (Server Key: ${serverKey || 'Not Found'}).`
          );
          // Add error response directly to avoid race conditions if using Promise.all
          functionResponses.push({
            functionResponse: {
              name: toolName,
              response: {
                content: `Error: Tool "${toolName}" could not be routed to a server. It might be unavailable or the mapping failed.`,
              },
            },
          });
          return; // Skip to the next tool call in the map function
        }

        console.log(
          `Attempting MCP tool "${toolName}" via server "${serverKey}" with args:`,
          toolArgs
        );

        let attempt = 0;
        let success = false;
        let mcpToolResult: any = null; // To store the successful result
        let lastToolError: any = null; // To store the last error encountered

        while (attempt < TOTAL_ATTEMPTS && !success) {
          attempt++;
          try {
            console.log(`  [Attempt ${attempt}/${TOTAL_ATTEMPTS}] Calling tool "${toolName}"...`);
            mcpToolResult = await targetClient.callTool({
              name: toolName,
              arguments: toolArgs as { [x: string]: unknown } | undefined,
            });
            console.log(`  [Attempt ${attempt}] SUCCESS for tool "${toolName}". Response:`, mcpToolResult);
            success = true; // Mark as successful to exit the loop

          } catch (toolError: any) {
            lastToolError = toolError; // Store the error
            console.warn(
              `  [Attempt ${attempt}/${TOTAL_ATTEMPTS}] FAILED for tool "${toolName}" via server "${serverKey}". Error:`,
              toolError.message || toolError // Log the specific error message
            );

            // If it's not the last attempt, wait before retrying
            if (attempt < TOTAL_ATTEMPTS) {
              console.log(`    Retrying in ${MCP_TOOL_RETRY_DELAY_MS}ms...`);
              await delay(MCP_TOOL_RETRY_DELAY_MS);
            } else {
               console.error(
                 `❌ Tool "${toolName}" failed after ${TOTAL_ATTEMPTS} attempts. Last error:`,
                 lastToolError
               );
            }
          }
        } // End retry while loop

        // --- Process the result (either success or final failure) ---
        if (success && mcpToolResult) {
          functionResponses.push({
            functionResponse: {
              name: toolName,
              response: {
                content:
                  typeof mcpToolResult.content === "string"
                    ? mcpToolResult.content
                    : JSON.stringify(mcpToolResult.content) ||
                      "Tool executed successfully.", // Fallback content
              },
            },
          });
        } else {
          // All attempts failed, push the error response
          functionResponses.push({
            functionResponse: {
              name: toolName,
              response: {
                content: `Error executing tool ${toolName} after ${TOTAL_ATTEMPTS} attempts: ${
                  lastToolError?.message || "Unknown error during tool execution" // Use optional chaining and provide a fallback
                }`,
              },
            },
          });
        }
      })); // End Promise.all map function

      // Ensure functionResponses are ordered correctly if needed, although Gemini usually handles unordered responses.
      // If strict order based on Gemini's request matters, avoid Promise.all and use the original sequential for loop.

      console.log(
        "Sending tool responses back to Gemini:",
        JSON.stringify(functionResponses)
      );
      result = await chat.sendMessage(functionResponses);
      response = result.response;

      currentContent = response?.candidates?.[0]?.content;
      functionCallsToProcess = currentContent?.parts
        ?.filter((part: Part) => !!part.functionCall)
        .map((part: Part) => part.functionCall as FunctionCall);
    } // End while loop for processing function calls

    // --- Extract final text answer ---
    let finalAnswer = "Sorry, I could not generate a text response."; // Default message
    if (response?.candidates?.[0]?.content?.parts) {
        const textParts = response.candidates[0].content.parts
          .filter((part: Part): part is Part & { text: string } => typeof part.text === 'string') // Type guard for text part
          .map((part) => part.text);
        if (textParts.length > 0) {
          finalAnswer = textParts.join(" "); // Join with space for readability
        } else if (!response.candidates[0].finishReason || response.candidates[0].finishReason === 'STOP') {
           // If there are no text parts but the model finished normally, check if there was *any* content
           // This can happen if the only response was a function call result that didn't yield text.
           // We might want to keep the default "Sorry..." message or adjust based on context.
           console.log("Gemini finished, but no final text part was generated.");
        }
    } else if (response?.promptFeedback?.blockReason) {
        // Handle cases where the response was blocked
        finalAnswer = `My response was blocked. Reason: ${response.promptFeedback.blockReason}`;
        console.warn(`Gemini response blocked: ${response.promptFeedback.blockReason}`, response.promptFeedback);
    }


    console.log("Final Gemini response being sent to user:", finalAnswer);

    const finalHistory = await chat.getHistory();
    res.json({ reply: finalAnswer, history: finalHistory });
  } catch (err: any) {
    console.error("Error in chatWithLLM:", err.stack || err); // Log stack trace if available
    res.status(500).json({ error: `Failed in chat handler: ${err.message || 'Unknown server error'}` });
  }
};
// --- END OF FILE chatLLM.ts ---