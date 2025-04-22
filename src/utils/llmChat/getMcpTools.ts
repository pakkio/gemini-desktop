import { convertMcpSchemaToGeminiSchema } from "./convertMcpSchemaToGeminiSchema";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js";
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { FunctionDeclaration } from "@google/generative-ai";
import {
  StdioClientTransport,
  StdioServerParameters,
} from "@modelcontextprotocol/sdk/client/stdio.js";
const mcpClients = new Map<string, McpClient>(); // Map serverKey -> McpClient instance
const toolToServerMap = new Map<string, string>(); // Map toolName -> serverKey
let allMcpTools: McpTool[] = []; // Aggregated list
let allGeminiTools: FunctionDeclaration[] = []; // Aggregated list for Gemini

export async function connectToMcpServers(): Promise<{
  allGeminiTools: FunctionDeclaration[] ;
    mcpClients: Map<string, any>;
  }>  {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const configPath = path.join(
    __dirname,
    "../src/backend/data/servicesConfig.json"
  );
  const data = fs.readFileSync(configPath, "utf-8");
  if (!data) {
    return { allGeminiTools, mcpClients };
  }
  const parsedConfig = JSON.parse(data);
  const serverConfigs = parsedConfig?.leftList || [];
console.log(serverConfigs,"serveconfig")
  mcpClients.clear();
  toolToServerMap.clear();
  allMcpTools = [];
  allGeminiTools = [];

  const connectionPromises = serverConfigs.map(
    async (serverConfig: {
      label: string;
      key: string;
      config: { env: object; command: string; args: string[] };
    }) => {
      if (
        !serverConfig.config.command ||
        !Array.isArray(serverConfig.config.args)
      ) {
        console.error(
          `❌ Invalid configuration for server "${serverConfig.label}": Missing 'command' or 'args'. Skipping.`
        );
        return;
      }

      console.log(
        `Attempting to connect to MCP server "${serverConfig.label}"...`
      );
      try {
        const nodeExecutablePath = process.execPath; // Path to the currently running node
        const nodeDir = path.dirname(nodeExecutablePath);
        const currentPath = process.env.PATH || "";
        // Prepend node's directory to PATH (safer than replacing)
        const effectivePath = `${nodeDir}${path.delimiter}${currentPath}`;

        const childEnv = {
          ...process.env, // Inherit parent environment
          ...(serverConfig.config.env || {}), // Add environment vars from config
          PATH: effectivePath, // Override PATH to include node dir
        };
        // --- END CHANGE ---

        // Use StdioServerParameters type
        const params: StdioServerParameters = {
          command: serverConfig.config.command, // Should still be the absolute path to npx here
          args: serverConfig.config.args,
          // --- Use the constructed environment ---
          env: childEnv,
          // cwd: serverConfig.cwd || undefined // Optional: Set working directory
        };

        const transport = new StdioClientTransport(params);
        const client = new McpClient({
          name: `mcp-gemini-backend-${serverConfig.key}`,
          version: "1.0.0",
        });

        // Connect (this might throw if the command fails immediately)
        client.connect(transport);

        // Store client before listing tools (in case listTools fails)
        mcpClients.set(serverConfig.key, client);

        // List tools for this specific server
        const toolsResult = await client.listTools(); // This can also throw
        const currentServerTools = toolsResult.tools;
        console.log(
          `✅ Connected to "${
            serverConfig.key
          }" with tools: ${currentServerTools.map((t) => t.name).join(", ")}`
        );

        // Aggregate tools and map them
        currentServerTools.forEach((tool) => {
          if (toolToServerMap.has(tool.name)) {
            console.warn(
              `⚠️ Tool name conflict: Tool "${tool.name}" from server "${
                serverConfig.key
              }" overrides the same tool from server "${toolToServerMap.get(
                tool.name
              )}".`
            );
          }
          allMcpTools.push(tool);
          toolToServerMap.set(tool.name, serverConfig.key);
        });
      } catch (e: any) {
        console.error(
          `❌ Failed to connect to MCP server "${serverConfig.key}": `,
          e.message
        );
        // Ensure client is removed if connection failed
        if (mcpClients.has(serverConfig.key)) {
          mcpClients.delete(serverConfig.key);
        }
      }
    }
  );

  // Wait for all connection attempts to complete
  await Promise.all(connectionPromises);

  // Generate combined Gemini tool list after connecting to all servers
  if (allMcpTools.length > 0) {
    allGeminiTools = allMcpTools.map((tool) => ({
      name: tool.name,
      description: tool.description || "No description provided",
      parameters: convertMcpSchemaToGeminiSchema(tool.inputSchema),
    }));
    console.log(
      `🔌 Total ${allMcpTools.length} MCP tools aggregated for Gemini.`
    );
    return { allGeminiTools, mcpClients };
    // console.log("Aggregated Gemini tools definitions:", JSON.stringify(allGeminiTools, null, 2)); // Optional: Log combined list
  } else {
    console.warn("⚠️ No MCP tools were successfully loaded from any server.");
    return { allGeminiTools, mcpClients };
  }
}
