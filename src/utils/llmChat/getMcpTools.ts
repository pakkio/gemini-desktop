// --- START OF FILE getMcpTools.ts ---

import { convertMcpSchemaToGeminiSchema } from "./convertMcpSchemaToGeminiSchema";
import fs from "fs";
import os from "os"; // <--- ADDED for os.platform()
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
import which from 'which';

const mcpClients = new Map<string, McpClient>();
const toolToServerMap = new Map<string, string>();
let allMcpTools: McpTool[] = [];
let allGeminiTools: FunctionDeclaration[] = [];

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
    if (!isPackaged) {
       console.log(`${timestamp} ${messageString}`);
    }
  } catch (e) {
      console.error("Failed to write to log file:", logPath, e);
  }
}

// --- Runner Path Discovery ---

// Find npx path ONCE (EXISTING NPX LOGIC - UNTOUCHED)
let npxPath: string | null = null;
try {
    npxPath = which.sync('npx');
    logToFile(`Found 'npx' executable via which.sync at: ${npxPath}`);
} catch (e) {
    logToFile(`⚠️ Could not find 'npx' in the system PATH (via which.sync). Error: ${e instanceof Error ? e.message : String(e)}`);
    logToFile(`   Please ensure Node.js (which includes npx) is installed and its 'bin' directory is in the system's PATH environment variable.`);
    logToFile(`   Falling back to using 'npx' directly.`);
    npxPath = 'npx'; // Fallback
}

// Find uvx path ONCE (NEW UVX LOGIC - mirrors npx pattern)
let uvxPath: string | null = null;
logToFile("--- Initializing uvx path discovery ---");

// 1. Try to find bundled uvx (and its 'uv' dependency)
const platform = os.platform();
const uvxExecutableName = platform === 'win32' ? 'uvx.exe' : 'uvx';
const uvExecutableName = platform === 'win32' ? 'uv.exe' : 'uv';

let bundledUvxBasePath: string;
if (app.isPackaged) {
    bundledUvxBasePath = path.join(process.resourcesPath, 'bin');
} else {
    bundledUvxBasePath = path.join(app.getAppPath(), 'resources', 'bin');
}
const bundledUvxFullPath = path.join(bundledUvxBasePath, uvxExecutableName);
const bundledUvFullPath = path.join(bundledUvxBasePath, uvExecutableName);

let foundBundledUvx = false;
try {
    logToFile(`(uvx) Checking for bundled uvx at: ${bundledUvxFullPath}`);
    fs.accessSync(bundledUvxFullPath, fs.constants.X_OK); // Check uvx exists and is executable
    logToFile(`(uvx) Found bundled '${uvxExecutableName}'. Checking for its dependency '${uvExecutableName}' at: ${bundledUvFullPath}`);
    try {
        fs.accessSync(bundledUvFullPath, fs.constants.X_OK); // Check uv exists and is executable
        uvxPath = bundledUvxFullPath;
        foundBundledUvx = true;
        logToFile(`✅ Successfully found BUNDLED 'uvx' (and 'uv' dependency) at: ${uvxPath}`);
    } catch (uvCheckError) {
        logToFile(`⚠️ Found bundled '${uvxExecutableName}', but its required dependency '${uvExecutableName}' is missing or not executable in '${bundledUvxBasePath}'. Error: ${uvCheckError instanceof Error ? uvCheckError.message : String(uvCheckError)}`);
        logToFile(`   Ensure both '${uvExecutableName}' and '${uvxExecutableName}' are in '${bundledUvxBasePath}' and executable.`);
    }
} catch (uvxCheckError) {
    logToFile(`(uvx) Bundled '${uvxExecutableName}' not found or not executable at '${bundledUvxFullPath}'. Error: ${uvxCheckError instanceof Error ? uvxCheckError.message : String(uvxCheckError)}`);
}

// 2. If bundled uvx not found or 'uv' dependency missing, try finding uvx in system PATH
if (!foundBundledUvx) {
    logToFile("(uvx) Bundled 'uvx' (with 'uv' dependency) not resolved. Attempting to find 'uvx' in system PATH...");
    try {
        uvxPath = which.sync('uvx');
        logToFile(`Found 'uvx' executable via which.sync in system PATH at: ${uvxPath}`);
    } catch (e) {
        logToFile(`⚠️ Could not find 'uvx' in the system PATH (via which.sync). Error: ${e instanceof Error ? e.message : String(e)}`);
        logToFile(`   Please ensure 'uv' (which includes uvx) is installed and its location is in the system's PATH, or bundle it correctly.`);
        logToFile(`   Falling back to using 'uvx' directly.`);
        uvxPath = 'uvx'; // Fallback
    }
}
logToFile(`--- Final resolved uvx path: ${uvxPath} ---`);


// --- Main Function ---
export async function connectToMcpServers(webSearch: boolean): Promise<{
  allGeminiTools: FunctionDeclaration[];
  mcpClients: Map<string, McpClient>;
  toolToServerMap: Map<string, string>;
}> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const configPath = isPackaged
      ? path.join(app.getPath("userData"), "mcpServicesConfig.json")
      : path.join(__dirname, "../src/backend/configurations/mcpServicesConfig.json");

  logToFile(`--- Starting connectToMcpServers ---`);
  logToFile(`Running in ${isPackaged ? 'packaged' : 'development'} mode.`);
  logToFile(`Attempting to load MCP config from: ${configPath}`);
  logToFile(`NPM Executable Path (npx): ${npxPath}`); // Log resolved npxPath
  logToFile(`UV Executable Path (uvx): ${uvxPath}`); // Log resolved uvxPath


  mcpClients.clear();
  toolToServerMap.clear();
  allMcpTools = [];
  allGeminiTools = [];

  let data: string;
  try {
    if (isPackaged && !fs.existsSync(configPath)) {
        logToFile(`⚠️ MCP config file not found at ${configPath}. No servers will be started.`);
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

  // const commandToExecute = npxPath || 'npx'; // This was for npx-only default

  const connectionPromises = serverConfigs.map(
    async (serverConfig: {
      label: string;
      key: string;
      config: {
        env?: Record<string, string>;
        command?: string; // Can be "npx", "uvx", or a full path
        args: string[];
      };
    }) => {
      if (serverConfig.key === "mcp-unity") {
        serverConfig.config.args = serverConfig?.config?.env
          ?.ABSOLUTE_PATH_TO_BUILD
          ? [serverConfig?.config?.env?.ABSOLUTE_PATH_TO_BUILD]
          : [];
      }

      if(!webSearch && serverConfig.key === 'brave-search') {
          logToFile(`Skipping server "${serverConfig.label}" (key: ${serverConfig.key}) because webSearch is false.`);
          return;
      }
      if (!serverConfig.config || !Array.isArray(serverConfig.config.args)) {
        logToFile(JSON.stringify(serverConfig, null, 2));
        logToFile(`❌ Invalid configuration for server "${serverConfig.label}": Missing 'config' or 'args'. Skipping.`);
        return;
      }

      let specificCommand: string;
      let runnerType: string; // For logging

      if (serverConfig.config.command === 'uvx') {
          specificCommand = uvxPath || 'uvx'; // Use resolved uvxPath, or fallback to 'uvx' string
          runnerType = 'uvx';
          if (specificCommand === 'uvx' && uvxPath !== 'uvx') { // i.e. uvxPath was a full path but we're using the string
              logToFile(`Server "${serverConfig.label}": Using 'uvx' directly as resolved uvxPath is '${uvxPath}' but config specifically asks for 'uvx'. This is unusual.`);
          } else if (uvxPath === 'uvx') {
              logToFile(`Server "${serverConfig.label}": Using 'uvx' directly because a specific path for uvx (bundled or system) was not found or resolved.`);
          }
      } else if (serverConfig.config.command && serverConfig.config.command !== 'npx') {
          // Custom command (neither 'npx' nor 'uvx' explicitly)
          specificCommand = serverConfig.config.command;
          runnerType = 'custom';
      } else {
          // Default to npx or if command is 'npx'
          specificCommand = npxPath || 'npx'; // Use resolved npxPath, or fallback to 'npx' string
          runnerType = 'npx';
          if (npxPath === 'npx') { // Only log if we are using the fallback string for npx
             logToFile(`Server "${serverConfig.label}": Config command is '${serverConfig.config.command || "default"}', using 'npx' directly as a full path was not found.`);
          }
      }

      // Original skip logic for npx if it was the effective command AND no npxPath resolved to a full path (i.e., npxPath is 'npx')
      // This check should be about the *resolved* npxPath, not the fallback string.
      // The original npxPath is either a full path or the string 'npx'.
      // If specificCommand effectively becomes 'npx' AND the original npxPath discovery failed (so npxPath is 'npx' string)
      // This check was: `if (specificCommand === 'npx' && !npxPath)`
      // If npxPath is 'npx' (string), then !npxPath is false. This check needs care.
      // The intent was: if we need npx and all we have is the string 'npx' (because which.sync failed), then it's risky.

      // Let's refine the skip/warning:
      if (runnerType === 'npx' && specificCommand === 'npx' && (npxPath === 'npx' || npxPath === null) ) {
          // This means npx is the runner, we're trying to use the 'npx' string command,
          // because our initial attempt to find a full path for npx failed.
          logToFile(
              `⚠️ Server "${serverConfig.label}" (npx runner): Attempting to use 'npx' command directly as a full path was not found. ` +
              `This relies on 'npx' being in the OS's PATH for the packaged app, which may not be the case.`
          );
          // Original code skipped here if !npxPath, but npxPath is now always set (either full path or 'npx' string)
          // So, we don't skip, just warn, and let StdioClientTransport fail if the OS can't find 'npx'.
      }
      if (runnerType === 'uvx' && specificCommand === 'uvx' && (uvxPath === 'uvx' || uvxPath === null)) {
          logToFile(
              `⚠️ Server "${serverConfig.label}" (uvx runner): Attempting to use 'uvx' command directly as a full path (bundled or system) was not found. ` +
              `This relies on 'uvx' being in the OS's PATH for the packaged app.`
          );
      }


      logToFile(`Processing server config: ${serverConfig.label} (Runner: ${runnerType}, Command: ${specificCommand}, Args: ${JSON.stringify(serverConfig.config.args)})`);

      let transport: StdioClientTransport | null = null;

      try {
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

        const params: StdioServerParameters = {
            command: specificCommand,
            args: serverConfig.config.args,
            env: filteredChildEnv as Record<string, string>,
        };

        logToFile(`Attempting to start MCP server "${serverConfig.label}" with command: ${params.command} ${(params.args || []).join(' ')}`);

        transport = new StdioClientTransport(params);

        transport.onclose = () => {
            logToFile(`Transport explicitly closed for ${serverConfig.label}.`);
        };
        transport.onerror = (err) => {
             logToFile(`Transport error for ${serverConfig.label}: ${err.message}`);
        }

        const client = new McpClient({
          name: `mcp-gemini-backend-${serverConfig.key}`,
          version: "1.0.0",
        });

        await client.connect(transport);

        mcpClients.set(serverConfig.key, client);
        logToFile(`MCP Client connected for ${serverConfig.label}. Listing tools...`);

        const toolsResult = await client.listTools();
        const currentServerTools = toolsResult.tools;
        logToFile(
          `✅ Connected to "${
            serverConfig.key
          }" (${serverConfig.label}) using ${runnerType} with tools: ${currentServerTools.map((t) => t.name).join(", ")}`
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
        logToFile(`   Runner Type: ${runnerType}`);
        logToFile(`   Command Attempted: ${specificCommand}`);
        logToFile(`   Arguments: ${JSON.stringify(serverConfig.config.args || [])}`);
        logToFile(`   Error: ${errorMsg}`);

        if (errorMsg.includes('ENOENT')) {
             logToFile(`   Hint: ENOENT usually means the command '${specificCommand}' was not found or is not executable.`);
             if (runnerType === 'npx') {
                 logToFile(`         - For npx: Is Node.js installed and 'npx' (resolved to '${npxPath}') in the system PATH accessible to the app?`);
             } else if (runnerType === 'uvx') {
                 logToFile(`         - For uvx: Was 'uvx' (resolved to '${uvxPath}') found bundled (with 'uv' dependency) or in system PATH accessible to the app?`);
                 logToFile(`         - If bundled, ensure 'uv' & 'uvx' are in 'resources/bin/' and executable.`);
             } else { // Custom command
                 logToFile(`         - If using a custom command, is '${specificCommand}' correct and in PATH or an absolute path?`);
             }
        } else if (errorMsg.includes('closed') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('Transport closed')) {
             logToFile(`   Hint: Connection closed/refused suggests the server process started but exited or crashed immediately.`);
             logToFile(`         - Check the server's own logs/output if possible (e.g., if it's a script, add logging).`);
             logToFile(`         - If using 'uvx', this can happen if 'uvx' starts but the underlying 'uv' command fails or the target MCP script (e.g. 'blender-mcp') crashes.`);
             logToFile(`         - Check requirements (e.g., API keys in env: ${Object.keys(serverConfig.config.env || {}).join(', ')})`);
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