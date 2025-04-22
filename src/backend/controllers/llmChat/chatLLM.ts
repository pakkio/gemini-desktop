import {
  Content,
  Part,
  FunctionCall,
  GenerateContentResponse,
} from "@google/generative-ai";
import { connectToMcpServers } from "../../../utils/llmChat/getMcpTools";
import { initializeAndGetModel } from "../../../llm/gemini";

export const chatWithLLM = async (req: any, res: any) => {
  try {
    const toolToServerMap = new Map<string, string>();
    const { message, history } = req.body;
    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }
    const { allGeminiTools, mcpClients } = await connectToMcpServers();
    if (mcpClients.size === 0) {
      res.status(503).json({ error: "No MCP Servers are connected" });
      return;
    }
    const geminiModel = await initializeAndGetModel();
    if (!geminiModel) {
      res.status(503).json({ error: "Server LLM not configured" });
      return;
    }
    const chat = geminiModel.startChat({
      history: (history || []) as Content[],

      // Use the aggregated gemini tools list
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

      // Process calls sequentially for simplicity
      for (const call of functionCallsToProcess) {
        const toolName = call.name;
        const toolArgs = call.args;

        // --- Find the correct MCP client for this tool ---
        const serverKey = toolToServerMap.get(toolName);
        const targetClient = serverKey ? mcpClients.get(serverKey) : undefined;

        if (!targetClient) {
          console.error(
            `❌ Tool "${toolName}" requested by Gemini, but no connected MCP client provides it or the client is down.`
          );
          functionResponses.push({
            functionResponse: {
              name: toolName,
              response: {
                content: `Error: Tool "${toolName}" is not available or the corresponding server is down.`,
              },
            },
          });
          continue; // Skip to next call
        }

        console.log(
          `Calling MCP tool "${toolName}" via server "${serverKey}" with args:`,
          toolArgs
        );
        try {
          // --- Call the specific client instance ---
          const mcpToolResult = await targetClient.callTool({
            name: toolName,
            arguments: toolArgs as { [x: string]: unknown } | undefined,
          });
          console.log(`MCP Tool "${toolName}" response:`, mcpToolResult);
          functionResponses.push({
            functionResponse: {
              name: toolName,
              response: {
                content:
                  typeof mcpToolResult.content === "string"
                    ? mcpToolResult.content
                    : JSON.stringify(mcpToolResult.content) ||
                      "Tool executed successfully.",
              },
            },
          });
        } catch (toolError: any) {
          console.error(
            `Error calling MCP tool "${toolName}" via server "${serverKey}":`,
            toolError
          );
          functionResponses.push({
            functionResponse: {
              name: toolName,
              response: {
                content: `Error executing tool ${toolName}: ${
                  toolError.message || "Unknown error"
                }`,
              },
            },
          });
        }
      } // End for loop processing calls

      console.log(
        "Sending tool responses back to Gemini:",
        JSON.stringify(functionResponses)
      );
      result = await chat.sendMessage(functionResponses);
      response = result.response;

      // Re-evaluate function calls for the next iteration
      currentContent = response?.candidates?.[0]?.content;
      functionCallsToProcess = currentContent?.parts
        ?.filter((part: Part) => !!part.functionCall)
        .map((part: Part) => part.functionCall as FunctionCall);
    } // End while loop

    // --- Extract final text answer (remains the same) ---
    let finalAnswer = "Sorry, I could not generate a text response."; // Default response
    if (response?.candidates?.[0]?.content?.parts) {
      const textParts = response.candidates[0].content.parts
        .filter((part: Part) => typeof part.text === "string") // Filter for parts with text
        .map((part: Part) => part.text); // Extract text
      if (textParts.length > 0) {
        finalAnswer = textParts.join(""); // Join text parts
      }
    }
    console.log("Final Gemini response:", finalAnswer); // This logged the correct summary

    const finalHistory = await chat.getHistory();
    res.json({ reply: finalAnswer, history: finalHistory });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to read config." });
  }
};
