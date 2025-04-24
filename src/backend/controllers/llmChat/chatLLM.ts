// --- START OF FILE chatLLM.ts ---

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
    // REMOVE the local declaration of toolToServerMap here
    // const toolToServerMap = new Map<string, string>(); // <-- REMOVE THIS LINE

    const { message, history } = req.body;
    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    // Destructure the returned map
    const { allGeminiTools, mcpClients, toolToServerMap } = await connectToMcpServers(); // <-- GET THE MAP HERE

    // Log the actual tools being sent to Gemini for debugging
    console.log("--- Tools passed to Gemini ---");
    console.log(JSON.stringify(allGeminiTools, null, 2));
    console.log("-----------------------------");
    console.log("--- Tool to Server Map ---");
    console.log(toolToServerMap);
    console.log("-------------------------");


    if (mcpClients.size === 0) {
      // Pass the maps here too for better error reporting if needed
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

      for (const call of functionCallsToProcess) {
        const toolName = call.name;
        const toolArgs = call.args;

        // --- Use the CORRECT toolToServerMap ---
        const serverKey = toolToServerMap.get(toolName); // This map now has data
        const targetClient = serverKey ? mcpClients.get(serverKey) : undefined;

        if (!targetClient) {
          console.error(
            `❌ Tool "${toolName}" requested by Gemini, but no connected MCP client provides it or the client is down (Server Key not found in map or client missing).` // Updated error
          );
          functionResponses.push({
            functionResponse: {
              name: toolName,
              response: {
                content: `Error: Tool "${toolName}" could not be routed to a server. It might be unavailable or the mapping failed.`, // Updated response
              },
            },
          });
          continue;
        }

        console.log(
          `Calling MCP tool "${toolName}" via server "${serverKey}" with args:`,
          toolArgs
        );
        try {
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
      } // End for loop

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
    } // End while loop

    // --- Extract final text answer ---
    let finalAnswer = "Sorry, I could not generate a text response.";
    if (response?.candidates?.[0]?.content?.parts) {
      const textParts = response.candidates[0].content.parts
        .filter((part: Part) => typeof part.text === "string")
        .map((part: Part) => part.text);
      if (textParts.length > 0) {
        finalAnswer = textParts.join("");
      }
    }
    console.log("Final Gemini response:", finalAnswer);

    const finalHistory = await chat.getHistory();
    res.json({ reply: finalAnswer, history: finalHistory });
  } catch (err: any) { // Add type safety for error
    console.error("Error in chatWithLLM:", err); // Log full error
    res.status(500).json({ error: `Failed in chat handler: ${err.message || 'Unknown error'}` }); // Provide more error detail
  }
};
// --- END OF FILE chatLLM.ts ---