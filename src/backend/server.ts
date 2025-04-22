import express, { Request, Response, Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes/index.ts';
import {
    GoogleGenerativeAI,
    Part,
    FunctionDeclaration,
    FunctionCall,
    Content,
    SchemaType,
    GenerateContentResponse,
} from "@google/generative-ai";
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport, StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js"; // Import StdioServerParameters
import { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js";
// import { z } from "zod";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();
export function startServer() {

// --- Configuration ---
const PORT = process.env.PORT || 5001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Get path to config file from environment
const MCP_CONFIG_PATH = process.env.MCP_CONFIG_PATH;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in .env file");
}
// Check for config path instead of single server path
if (!MCP_CONFIG_PATH) {
  throw new Error("MCP_CONFIG_PATH is not set in .env file (should point to mcp-client-config.json)");
}
const app: Application = express();
app.use(cors({
  origin: 'http://localhost:5173',
}));
app.use(express.json());

// --- MCP Client Setup ---
// Store multiple clients and map tools to server keys
const mcpClients = new Map<string, McpClient>(); // Map serverKey -> McpClient instance
const toolToServerMap = new Map<string, string>(); // Map toolName -> serverKey
let allMcpTools: McpTool[] = []; // Aggregated list
let allGeminiTools: FunctionDeclaration[] = []; // Aggregated list for Gemini

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const absoluteConfigPath = path.resolve(__dirname, MCP_CONFIG_PATH);

// Interface remains the same
interface McpPropertySchema {
    type: string;
    description?: string;
    items?: McpPropertySchema | { type: string };
    properties?: { [key: string]: McpPropertySchema };
    required?: string[];
}

function convertMcpSchemaToGeminiSchema(mcpSchema: McpTool['inputSchema']): FunctionDeclaration['parameters'] {
    const properties: { [k: string]: any } = {};

    if (mcpSchema?.properties) {
        for (const key in mcpSchema.properties) {
            if (Object.prototype.hasOwnProperty.call(mcpSchema.properties, key)) {
                const prop = mcpSchema.properties[key] as McpPropertySchema;
                let geminiType: SchemaType;
                let geminiPropertyDefinition: any = { description: prop.description || '' };

                switch (prop.type) {
                    case 'string':
                    case 'number':
                    case 'integer':
                    case 'boolean':
                        // Map simple types directly
                        geminiType = SchemaType[prop.type.toUpperCase() as keyof typeof SchemaType] || SchemaType.STRING;
                        geminiPropertyDefinition.type = geminiType;
                        break;

                    case 'object':
                        geminiType = SchemaType.OBJECT;
                        geminiPropertyDefinition.type = geminiType;
                        if (prop.properties) {
                            // --- FIX 1: Check result of recursive call ---
                            const nestedSchema = convertMcpSchemaToGeminiSchema({
                                type: 'object',
                                properties: prop.properties,
                                required: prop.required
                            });
                            // Only assign if nestedSchema and its properties exist
                            geminiPropertyDefinition.properties = nestedSchema?.properties ?? {}; // Default to empty object
                            geminiPropertyDefinition.required = nestedSchema?.required ?? [];     // Default to empty array
                        } else {
                            geminiPropertyDefinition.properties = {};
                            geminiPropertyDefinition.required = [];
                        }
                        break;

                    case 'array':
                        geminiType = SchemaType.ARRAY;
                        geminiPropertyDefinition.type = geminiType;
                        if (prop.items) {
                            // --- FIX 4: Declare itemType with let ---
                            let itemType = prop.items.type; // Use 'let'
                            let geminiItemType: SchemaType;
                            let itemDefinition: any = {}; // Define base item object

                            switch (itemType) {
                                case 'string': geminiItemType = SchemaType.STRING; itemDefinition.type = geminiItemType; break;
                                case 'number': geminiItemType = SchemaType.NUMBER; itemDefinition.type = geminiItemType; break;
                                case 'integer': geminiItemType = SchemaType.INTEGER; itemDefinition.type = geminiItemType; break;
                                case 'boolean': geminiItemType = SchemaType.BOOLEAN; itemDefinition.type = geminiItemType; break;
                                case 'object':
                                    geminiItemType = SchemaType.OBJECT;
                                    itemDefinition.type = geminiItemType;
                                    // --- FIX 2: Check if items is complex object before accessing properties ---
                                    if (typeof prop.items === 'object' && 'properties' in prop.items && prop.items.properties) {
                                         // --- FIX 3: Check result of recursive call ---
                                        const nestedItemSchema = convertMcpSchemaToGeminiSchema({
                                            type: 'object',
                                            properties: prop.items.properties, // Safe to access now
                                            required: prop.items.required     // Safe to access now
                                        });
                                        itemDefinition.properties = nestedItemSchema?.properties ?? {};
                                        itemDefinition.required = nestedItemSchema?.required ?? [];
                                    } else {
                                        // Simple object item type without defined properties
                                        itemDefinition.properties = {}; // Define empty properties
                                        itemDefinition.required = [];
                                    }
                                    // --- FIX 4: itemType was const, but no reassignment needed here now ---
                                    // itemType = undefined; // No longer needed
                                    break; // Break from inner switch
                                default:
                                    geminiItemType = SchemaType.STRING; // Default item type
                                    itemDefinition.type = geminiItemType;
                            }
                            // Assign the constructed item definition
                            geminiPropertyDefinition.items = itemDefinition;

                        } else {
                            console.warn(`⚠️ MCP tool property "${key}" is type 'array' but missing 'items' definition. Defaulting items to STRING for Gemini.`);
                            geminiPropertyDefinition.items = { type: SchemaType.STRING };
                        }
                        break; // End case 'array'

                    default:
                        geminiType = SchemaType.STRING;
                        geminiPropertyDefinition.type = geminiType;
                }
                properties[key] = geminiPropertyDefinition;
            }
        }
    }
    return {
        type: SchemaType.OBJECT,
        properties: properties,
        required: (mcpSchema?.required || []) as string[],
    };
}

// --- NEW Function to connect to MULTIPLE servers ---
async function connectToMcpServers() {
  console.log(`Reading MCP server configuration from: ${absoluteConfigPath}`);
  let configJson: any;
  try {
      const configFileContent = fs.readFileSync(absoluteConfigPath, 'utf-8');
      configJson = JSON.parse(configFileContent);
  } catch (err: any) {
      console.error(`❌ Error reading or parsing MCP config file at ${absoluteConfigPath}: ${err.message}`);
      return; // Stop if config is invalid
  }

  if (!configJson || !configJson.mcpServers || typeof configJson.mcpServers !== 'object') {
       console.error(`❌ Invalid MCP config file structure. Missing 'mcpServers' object.`);
       return;
  }

  const serverConfigs = configJson.mcpServers;
  const serverKeys = Object.keys(serverConfigs);

  console.log(`Found ${serverKeys.length} MCP server configurations: ${serverKeys.join(', ')}`);

  // Reset state before connecting
  mcpClients.clear();
  toolToServerMap.clear();
  allMcpTools = [];
  allGeminiTools = [];

  const connectionPromises = serverKeys.map(async (serverKey) => {
      const serverConfig = serverConfigs[serverKey];

      if (!serverConfig.command || !Array.isArray(serverConfig.args)) {
          console.error(`❌ Invalid configuration for server "${serverKey}": Missing 'command' or 'args'. Skipping.`);
          return;
      }

      console.log(`Attempting to connect to MCP server "${serverKey}"...`);
      try {
        const nodeExecutablePath = process.execPath; // Path to the currently running node
        const nodeDir = path.dirname(nodeExecutablePath);
        const currentPath = process.env.PATH || '';
        // Prepend node's directory to PATH (safer than replacing)
        const effectivePath = `${nodeDir}${path.delimiter}${currentPath}`;
    
        const childEnv = {
            ...process.env, // Inherit parent environment
            ...(serverConfig.env || {}), // Add environment vars from config
            PATH: effectivePath, // Override PATH to include node dir
        };
        // --- END CHANGE ---
    
    
        // Use StdioServerParameters type
        const params: StdioServerParameters = {
            command: serverConfig.command, // Should still be the absolute path to npx here
            args: serverConfig.args,
            // --- Use the constructed environment ---
            env: childEnv,
            // cwd: serverConfig.cwd || undefined // Optional: Set working directory
        };

          const transport = new StdioClientTransport(params);
          const client = new McpClient({ name: `mcp-gemini-backend-${serverKey}`, version: "1.0.0" });

          // Connect (this might throw if the command fails immediately)
          client.connect(transport);

          // Store client before listing tools (in case listTools fails)
          mcpClients.set(serverKey, client);

          // List tools for this specific server
          const toolsResult = await client.listTools(); // This can also throw
          const currentServerTools = toolsResult.tools;
          console.log(`✅ Connected to "${serverKey}" with tools: ${currentServerTools.map(t => t.name).join(', ')}`);

          // Aggregate tools and map them
          currentServerTools.forEach(tool => {
              if (toolToServerMap.has(tool.name)) {
                  console.warn(`⚠️ Tool name conflict: Tool "${tool.name}" from server "${serverKey}" overrides the same tool from server "${toolToServerMap.get(tool.name)}".`);
              }
              allMcpTools.push(tool);
              toolToServerMap.set(tool.name, serverKey);
          });

      } catch (e: any) {
          console.error(`❌ Failed to connect to MCP server "${serverKey}": `, e.message);
          // Ensure client is removed if connection failed
          if (mcpClients.has(serverKey)) {
              mcpClients.delete(serverKey);
          }
      }
  });

  // Wait for all connection attempts to complete
  await Promise.all(connectionPromises);

  // Generate combined Gemini tool list after connecting to all servers
  if (allMcpTools.length > 0) {
      allGeminiTools = allMcpTools.map(tool => ({
          name: tool.name,
          description: tool.description || "No description provided",
          parameters: convertMcpSchemaToGeminiSchema(tool.inputSchema),
      }));
      console.log(`🔌 Total ${allMcpTools.length} MCP tools aggregated for Gemini.`);
      // console.log("Aggregated Gemini tools definitions:", JSON.stringify(allGeminiTools, null, 2)); // Optional: Log combined list
  } else {
        console.warn("⚠️ No MCP tools were successfully loaded from any server.");
  }
}

// --- Gemini Client Setup --- (remains the same)
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash",systemInstruction:"You are a powerful assistant who have access to various tools , so you carefully checks what the user wants and check if you have any tool suitable for the answer available at your end. if yes make a call to that tool and send response to the user", });

// --- API Endpoint ---
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  const { message, history } = req.body;

  if (!message) { res.status(400).json({ error: 'Message is required' }); return; }
  // Check if ANY clients are connected
  if (mcpClients.size === 0) {
      res.status(503).json({ error: 'No MCP Servers are connected' });
      return;
  }

  try {
    console.log(`Received query: ${message}`);
    // Pass the aggregated tools to Gemini
    console.log("Available Gemini tools (aggregated):", JSON.stringify(allGeminiTools, null, 2));

    const chat = geminiModel.startChat({
        history: (history || []) as Content[],
        
        // Use the aggregated gemini tools list
        tools: allGeminiTools.length > 0 ? [{ functionDeclarations: allGeminiTools }] : undefined,
    });

    let result = await chat.sendMessage(message);
    let response: GenerateContentResponse | undefined = result.response;

    let currentContent: Content | undefined = response?.candidates?.[0]?.content;
    let functionCallsToProcess: FunctionCall[] | undefined = currentContent?.parts
        ?.filter((part: Part) => !!part.functionCall)
        .map((part: Part) => part.functionCall as FunctionCall);

    while (functionCallsToProcess && functionCallsToProcess.length > 0) {
        console.log(`Gemini requested ${functionCallsToProcess.length} tool call(s):`, functionCallsToProcess.map((c) => c.name));

        const functionResponses: Part[] = [];

        // Process calls sequentially for simplicity
        for (const call of functionCallsToProcess) {
            const toolName = call.name;
            const toolArgs = call.args;

            // --- Find the correct MCP client for this tool ---
            const serverKey = toolToServerMap.get(toolName);
            const targetClient = serverKey ? mcpClients.get(serverKey) : undefined;

            if (!targetClient) {
                console.error(`❌ Tool "${toolName}" requested by Gemini, but no connected MCP client provides it or the client is down.`);
                functionResponses.push({
                    functionResponse: { name: toolName, response: { content: `Error: Tool "${toolName}" is not available or the corresponding server is down.` } },
                });
                continue; // Skip to next call
            }

            console.log(`Calling MCP tool "${toolName}" via server "${serverKey}" with args:`, toolArgs);
            try {
                // --- Call the specific client instance ---
                const mcpToolResult = await targetClient.callTool({
                    name: toolName,
                    arguments: toolArgs as { [x: string]: unknown } | undefined,
                });
                 console.log(`MCP Tool "${toolName}" response:`, mcpToolResult);
                functionResponses.push({
                    functionResponse: { name: toolName, response: { content: typeof mcpToolResult.content === 'string' ? mcpToolResult.content : JSON.stringify(mcpToolResult.content) || "Tool executed successfully." } },
                });
            } catch (toolError: any) {
                 console.error(`Error calling MCP tool "${toolName}" via server "${serverKey}":`, toolError);
                 functionResponses.push({
                     functionResponse: { name: toolName, response: { content: `Error executing tool ${toolName}: ${toolError.message || 'Unknown error'}` } },
                 });
            }
        } // End for loop processing calls

        console.log("Sending tool responses back to Gemini:", JSON.stringify(functionResponses));
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
        .filter((part: Part) => typeof part.text === 'string') // Filter for parts with text
        .map((part: Part) => part.text); // Extract text
    if (textParts.length > 0) {
        finalAnswer = textParts.join(''); // Join text parts
    }
}
console.log("Final Gemini response:", finalAnswer); // This logged the correct summary

const finalHistory = await chat.getHistory();
res.json({ reply: finalAnswer, history: finalHistory });

  } catch (error: any) {
    console.error('Error processing chat:', error);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to process chat message', details: error.message });
    }
  }
});
app.use('/api', routes);
// --- Server Startup ---
app.listen(PORT, async () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  // Call the new connection function
  await connectToMcpServers();
});

// --- Updated Shutdown Logic ---
process.on('SIGINT', async () => {
    console.log("Shutting down...");
    const closingPromises: Promise<void>[] = [];
    if (mcpClients.size > 0) {
        console.log(`Closing ${mcpClients.size} MCP client connections...`);
        for (const client of mcpClients.values()) {
            // Add closing promise to the array
            closingPromises.push(client.close().catch(e => console.error("Error closing MCP client:", e.message))); // Add catch here
        }
        // Wait for all clients to attempt closing
        await Promise.all(closingPromises);
        console.log("All MCP Clients closed (or attempted to close).");
    }
    process.exit(0);
});
}

