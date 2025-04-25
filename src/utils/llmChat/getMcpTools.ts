// --- START OF FILE getMcpTools.ts ---

import { convertMcpSchemaToGeminiSchema } from "./convertMcpSchemaToGeminiSchema";
import fs from "fs";
// import os from "os"; // <--- REMOVED (Error 4)
import path from "path";
import { fileURLToPath } from "url";
import { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js";
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { FunctionDeclaration } from "@google/generative-ai";
import {
  StdioClientTransport,
  StdioServerParameters,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { app } from "electron";
import which from 'which'; // Ensure 'npm i --save-dev @types/which' is run (Error 1 fix)
// import { spawn, ChildProcess } from 'child_process'; // <--- REMOVED spawn and ChildProcess (Error 5 & 6 fix)

const mcpClients = new Map<string, McpClient>(); // Map serverKey -> McpClient instance
const toolToServerMap = new Map<string, string>(); // Map toolName -> serverKey
let allMcpTools: McpTool[] = []; // Aggregated list
let allGeminiTools: FunctionDeclaration[] = []; // Aggregated list for Gemini

const isPackaged = app.isPackaged;
const logPath = path.join(app.getPath("userData"), "backend.log");

// --- Helper Functions ---

try {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
} catch (e) {
  console.error("Failed to create log directory:", e);
}

function logToFile(message: string | unknown) {
  const messageString = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
  const timestamp = `[${new Date().toISOString()}]`;
  const logLine = `${timestamp} ${messageString}\n`;
  try {
    fs.appendFileSync(logPath, logLine);
    // Also log to console for easier debugging during development
    if (!isPackaged) {
       console.log(`${timestamp} ${messageString}`);
    }
  } catch (e) {
      console.error("Failed to write to log file:", logPath, e);
  }
}


// --- Main Function ---

// Find npx path ONCE
let npxPath: string | null = null;
try {
    npxPath = which.sync('npx'); // Use which.sync to find npx in PATH
    logToFile(`Found 'npx' executable at: ${npxPath}`);
} catch (e) {
    logToFile(`⚠️ Could not find 'npx' in the system PATH. MCP servers requiring npx will likely fail.`);
    logToFile(`   Error details: ${e instanceof Error ? e.message : String(e)}`);
    logToFile(`   Please ensure Node.js (which includes npx) is installed and its 'bin' directory is in the system's PATH environment variable.`);
    npxPath = 'npx'; // Fallback to just 'npx', hoping it's globally available
}

// <<< MODIFIED RETURN TYPE >>>
export async function connectToMcpServers(): Promise<{
  allGeminiTools: FunctionDeclaration[];
  mcpClients: Map<string, McpClient>;
  toolToServerMap: Map<string, string>; // <-- ADDED THIS
}> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const configPath = isPackaged
      ? path.join(app.getPath("userData"), "mcpServicesConfig.json")
      : path.join(__dirname, "../src/backend/configurations/mcpServicesConfig.json");

  logToFile(`--- Starting connectToMcpServers ---`);
  logToFile(`Running in ${isPackaged ? 'packaged' : 'development'} mode.`);
  logToFile(`Attempting to load MCP config from: ${configPath}`);

  // Ensure the module-level maps are cleared at the start of each run
  mcpClients.clear();
  toolToServerMap.clear();
  allMcpTools = [];
  allGeminiTools = [];

  let data: string;
  try {
    if (isPackaged && !fs.existsSync(configPath)) {
        logToFile(`⚠️ MCP config file not found at ${configPath}. Creating default or skipping.`);
        return { allGeminiTools: [], mcpClients: new Map(), toolToServerMap: new Map() };
    }
    data = fs.readFileSync(configPath, "utf-8");
  } catch (readError: any) {
    logToFile(`❌ Failed to read MCP config file at ${configPath}: ${readError.message}`);
    return { allGeminiTools: [], mcpClients: new Map(), toolToServerMap: new Map() };
  }

  if (!data) {
    logToFile("⚠️ MCP config file is empty or could not be read.");
    return { allGeminiTools: [], mcpClients: new Map(), toolToServerMap: new Map() };
  }

  let parsedConfig;
  try {
    parsedConfig = JSON.parse(data);
  } catch (parseError: any) {
    logToFile(`❌ Failed to parse MCP config file: ${parseError.message}`);
    return { allGeminiTools: [], mcpClients: new Map(), toolToServerMap: new Map() };
  }

  const serverConfigs = parsedConfig?.leftList || [];
  logToFile(`Found ${serverConfigs.length} server configurations.`);

  const commandToExecute = npxPath || 'npx';

  const connectionPromises = serverConfigs.map(
    async (serverConfig: {
      label: string;
      key: string;
      config: {
        env?: Record<string, string>;
        command?: string;
        args: string[];
      };
    }) => {
      if (!serverConfig.config || !Array.isArray(serverConfig.config.args)) {
        logToFile(`❌ Invalid configuration for server "${serverConfig.label}": Missing 'config' or 'args'. Skipping.`);
        return;
      }
       const specificCommand = serverConfig.config.command || commandToExecute;

       if (specificCommand === 'npx' && !npxPath) {
            logToFile(`❌ Skipping server "${serverConfig.label}" because 'npx' command was not found in PATH and config did not specify an alternative command.`);
            return;
       }

      logToFile(`Processing server config: ${serverConfig.label} (Command: ${specificCommand}, Args: ${JSON.stringify(serverConfig.config.args)})`);

      let transport: StdioClientTransport | null = null;
      // let childProcess: ChildProcess | undefined; // <--- REMOVED (Error 6)

      try {
        // --- Environment Setup ---
        const baseEnv = { ...process.env, ...(serverConfig.config.env || {}) };
        const filteredChildEnv: Record<string, string | undefined> = {};
        for (const key in baseEnv) {
          if (Object.prototype.hasOwnProperty.call(baseEnv, key)) {
            const value = baseEnv[key];
            if (value !== undefined) {
              filteredChildEnv[key] = value;
            }
          }
        }
        // --- End Env Setup ---


        // --- Direct Execution Parameters ---
        const params: StdioServerParameters = {
            command: specificCommand,
            args: serverConfig.config.args,
            env: filteredChildEnv as Record<string, string>,
            // shell: false, // <--- REMOVED (Error 2)
            // cwd: serverConfig.cwd || undefined
        };
        // --- End Parameters ---

        // --- Updated Logging Line (Error 3 fix) ---
        logToFile(`Attempting to start MCP server "${serverConfig.label}" directly with command: ${params.command} ${(params.args || []).join(' ')}`);

        // --- Modified Transport Instantiation to Capture Stderr ---
        transport = new StdioClientTransport(params);

        // --- REMOVED stderr capture / childProcess logic (Error 6 fix) ---

        const client = new McpClient({
          name: `mcp-gemini-backend-${serverConfig.key}`,
          version: "1.0.0",
        });

        transport.onclose = () => {
            logToFile(`Transport explicitly closed for ${serverConfig.label}.`);
        };
        transport.onerror = (err) => {
             logToFile(`Transport error for ${serverConfig.label}: ${err.message}`);
        }


        await client.connect(transport);

        mcpClients.set(serverConfig.key, client);
        logToFile(`MCP Client connected for ${serverConfig.label}. Listing tools...`);

        const toolsResult = await client.listTools();
        const currentServerTools = toolsResult.tools;
        logToFile(
          `✅ Connected to "${
            serverConfig.key
          }" (${serverConfig.label}) directly with tools: ${currentServerTools.map((t) => t.name).join(", ")}`
        );

        currentServerTools.forEach((tool) => {
          if (toolToServerMap.has(tool.name)) {
            logToFile(
              `⚠️ Tool name conflict: Tool "${tool.name}" from server "${
                serverConfig.key
              }" (${serverConfig.label}) overrides tool from server "${toolToServerMap.get(
                tool.name
              )}".`
            );
          }
          allMcpTools.push(tool);
          toolToServerMap.set(tool.name, serverConfig.key);
        });

      } catch (e: any) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        const errorStack = e instanceof Error ? `\nStack: ${e.stack}`: '';

        logToFile(`❌ Failed operation for MCP server "${serverConfig.label}"`);
        logToFile(`   Command: ${specificCommand}`);
        // --- Updated Logging Line (Error 3 fix applied here too) ---
        logToFile(`   Arguments: ${JSON.stringify(serverConfig.config.args || [])}`);
        logToFile(`   Error: ${errorMsg}`);

        if (errorMsg.includes('ENOENT')) {
             logToFile(`   Hint: ENOENT usually means the command '${specificCommand}' was not found.`);
             logToFile(`         - Is Node.js installed and '${specificCommand}' in the system PATH?`);
             logToFile(`         - If using a specific command in config, is it correct and in PATH?`);
        } else if (errorMsg.includes('closed') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('Transport closed')) {
             logToFile(`   Hint: Connection closed/refused suggests the server process started but exited or crashed immediately.`);
             logToFile(`         - Check the server's requirements (e.g., API keys in env).`);
             logToFile(`         - Are the environment variables correct? (${Object.keys(serverConfig.config.env || {}).join(', ')})`);
             logToFile(`         - The MCP server itself might have logged errors to its own console/stderr (difficult to capture here without process wrapping).`);
              // --- Updated Logging Line (Error 3 fix applied here too) ---
             logToFile(`         - Try running the command manually in a terminal: ${specificCommand} ${(serverConfig.config.args || []).join(' ')}`);
        } else {
            logToFile(`   Stack: ${errorStack}`);
        }

        if (mcpClients.has(serverConfig.key)) {
            mcpClients.delete(serverConfig.key);
        }
        if (transport && typeof transport.close === 'function') {
            try {
                transport.close();
            } catch (closeErr) {
                logToFile(`   Error closing transport during cleanup: ${closeErr}`);
            }
        }
        // --- REMOVED childProcess kill logic (Error 6 fix) ---
      }
    }
  );

  await Promise.all(connectionPromises);

  if (allMcpTools.length > 0) {
    allGeminiTools = allMcpTools.map((tool) => ({
      name: tool.name,
      description: tool.description || "No description provided",
      parameters: convertMcpSchemaToGeminiSchema(tool.inputSchema),
    }));
    logToFile(`🔌 Total ${allMcpTools.length} MCP tools aggregated for Gemini from ${mcpClients.size} connected server(s).`);
  } else {
    logToFile("⚠️ No MCP tools were successfully loaded from any connected server.");
  }

  logToFile(`connectToMcpServers finished. ${mcpClients.size} clients connected. ${toolToServerMap.size} tools mapped.`);

  return { allGeminiTools, mcpClients, toolToServerMap };
}

// --- END OF FILE getMcpTools.ts ---