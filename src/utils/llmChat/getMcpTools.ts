// --- START OF FILE getMcpTools.ts ---

import { convertMcpSchemaToGeminiSchema } from "./convertMcpSchemaToGeminiSchema";
import fs from "fs";
import os from "os"; // Import os module
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
import { app } from "electron";

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
  try {
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${messageString}\n`);
  } catch (e) {
      console.error("Failed to write to log file:", logPath, e);
  }
}

// Function to find the nvm script path
function findNvmScript(): string | null {
    const homeDir = os.homedir();
    const nvmDir = process.env.NVM_DIR || path.join(homeDir, '.nvm');
    const nvmScriptPath = path.join(nvmDir, 'nvm.sh');

    if (fs.existsSync(nvmScriptPath)) {
        logToFile(`Found nvm script at default location: ${nvmScriptPath}`);
        return nvmScriptPath;
    }

    // Check common Homebrew paths (adjust if needed for other OS/install methods)
    if (process.platform === 'darwin') {
        const brewPaths = [
            '/opt/homebrew/opt/nvm/nvm.sh', // Apple Silicon
            '/usr/local/opt/nvm/nvm.sh'    // Intel
        ];
        for (const brewPath of brewPaths) {
            if (fs.existsSync(brewPath)) {
                logToFile(`Found nvm script at Homebrew location: ${brewPath}`);
                return brewPath;
            }
        }
    }

    logToFile(`nvm script 'nvm.sh' not found in standard locations (~/.nvm, Homebrew). NVM sourcing will be skipped.`);
    return null;
}

// Function to get the default shell path
function getDefaultShell(): string {
    // Prioritize SHELL env var if available and valid
    const envShell = process.env.SHELL;
    if (envShell && fs.existsSync(envShell)) {
         logToFile(`Using shell from SHELL environment variable: ${envShell}`);
        return envShell;
    }

    // Fallback based on OS
    if (process.platform === 'darwin') {
        // Default to zsh on modern macOS
         logToFile(`Using default shell for macOS: /bin/zsh`);
        return '/bin/zsh';
    } else if (process.platform === 'win32') {
        // Typically cmd.exe, but Git Bash or WSL might be used.
        // Sticking to cmd for basic compatibility might be safer for spawn,
        // but complex commands might need bash/zsh if user uses them.
        // Let's default to cmd.exe for Windows spawn compatibility
         logToFile(`Using default shell for Windows: cmd.exe`);
        return 'cmd.exe'; // Or process.env.COMSPEC
    } else {
        // Default to bash on other Unix-like systems
         logToFile(`Using default shell for Linux/other: /bin/bash`);
        return '/bin/bash';
    }
}

// Simple shell arg escaping (use cautiously or use 'shell-quote' library)
function escapeShellArg(arg: string, shell: string): string {
    if (shell.endsWith('cmd.exe')) {
        // Basic Windows quoting: wrap in double quotes, escape internal quotes
        return `"${arg.replace(/"/g, '""')}"`;
    } else {
        // Basic Unix quoting: wrap in single quotes, escape internal single quotes
        return `'${arg.replace(/'/g, "'\\''")}'`;
    }
}


// --- Main Function ---

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
        logToFile(`⚠️ MCP config file not found at ${configPath}. No servers to connect.`);
        // Return empty state including the empty map
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

  // Find nvm script path ONCE
  const nvmScriptPath = findNvmScript();
  const shellExecutable = getDefaultShell();


  const connectionPromises = serverConfigs.map(
    async (serverConfig: {
      label: string;
      key: string;
      config: {
        env?: Record<string, string>;
        command: string; // e.g., 'npx'
        args: string[];   // e.g., ['-y', '@modelcontextprotocol/server-gitlab']
      };
    }) => {
      if (!serverConfig.config || !serverConfig.config.command || !Array.isArray(serverConfig.config.args)) {
        logToFile(`❌ Invalid configuration for server "${serverConfig.label}": Missing 'command' or 'args'. Skipping.`);
        return;
      }

      logToFile(`Processing server config: ${serverConfig.label} (Command: ${serverConfig.config.command}, Args: ${JSON.stringify(serverConfig.config.args)})`);

      let transport: StdioClientTransport | null = null;

      try {
        // --- Environment Setup ---
        const baseEnv = { ...process.env, ...(serverConfig.config.env || {}) };
        const filteredChildEnv: Record<string, string> = {};
        for (const key in baseEnv) {
          if (Object.prototype.hasOwnProperty.call(baseEnv, key)) {
            const value = baseEnv[key];
            if (value !== undefined) filteredChildEnv[key] = value;
          }
        }
        // --- End Env Setup ---

        // --- Construct command for MANUAL shell execution ---
        let commandPrefix = "";
        if (nvmScriptPath && !shellExecutable.endsWith('cmd.exe')) {
            // Add nvm sourcing for non-cmd shells if nvm script found
            // Use '.' (source) command. Escape the path just in case.
             commandPrefix = `. ${escapeShellArg(nvmScriptPath, shellExecutable)} && `;
             logToFile(`Prepending nvm source command for ${serverConfig.label}`);
        } else if (nvmScriptPath && shellExecutable.endsWith('cmd.exe')) {
            logToFile(`NVM sourcing in cmd.exe is complex and not automatically added. Ensure Node/npx is in PATH or provide absolute path.`);
            // Sourcing .sh in cmd.exe is not direct. User needs Node in PATH or provide full path.
        }

        // Escape the main command and arguments for the shell -c string
        const userCommandEscaped = escapeShellArg(serverConfig.config.command, shellExecutable);
        const userArgsEscaped = serverConfig.config.args.map(arg => escapeShellArg(arg, shellExecutable)).join(' ');

        // Combine prefix (if any) and the user's command
        const finalCommandString = `${commandPrefix}${userCommandEscaped} ${userArgsEscaped}`;

        logToFile(`Executing via shell: ${shellExecutable} with args: ['-c', "${finalCommandString}"]`);

        // Params for MANUAL shell invocation. DO NOT use shell: true here.
        const params: StdioServerParameters = {
            command: shellExecutable,       // Execute the shell itself
            args: ['-c', finalCommandString], // Pass the combined command string as argument to the shell
            env: filteredChildEnv,
            // shell: false // Explicitly false or omit
            // cwd: serverConfig.cwd || undefined
        };
        // --- End command construction ---

        logToFile(`Attempting to start MCP server "${serverConfig.label}" via manual shell execution...`);
        transport = new StdioClientTransport(params);

        const client = new McpClient({
          name: `mcp-gemini-backend-${serverConfig.key}`, // Use server key in client name for potential uniqueness
          version: "1.0.0",
        });

        await client.connect(transport);

        // Add the client to the map *before* listing tools (in case listTools fails)
        mcpClients.set(serverConfig.key, client);
        logToFile(`MCP Client connected for ${serverConfig.label}. Listing tools...`);

        const toolsResult = await client.listTools();
        const currentServerTools = toolsResult.tools;
        logToFile(
          `✅ Connected to "${
            serverConfig.key
          }" (${serverConfig.label}) via manual shell with tools: ${currentServerTools.map((t) => t.name).join(", ")}`
        );

        // Populate the maps AFTER successful connection and tool listing
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
          // Add to aggregated MCP tool list (used for generating Gemini list later)
          allMcpTools.push(tool);
          // Add mapping from tool name to server key
          toolToServerMap.set(tool.name, serverConfig.key); // <-- Populating the map
        });

      } catch (e: any) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        const errorStack = e instanceof Error ? `\nStack: ${e.stack}`: '';
        logToFile(`❌ Failed operation for MCP server "${serverConfig.label}" via manual shell: ${errorMsg}${errorStack}`);
        // Clean up client if it was added before the error
        if (mcpClients.has(serverConfig.key)) {
            mcpClients.delete(serverConfig.key);
        }
        // Log troubleshooting details
        if (errorMsg.includes('ENOENT')) {
             logToFile(`   ENOENT Error Detail: The shell '${shellExecutable}' could not find the command '${serverConfig.config.command}' after attempting setup (including nvm sourcing if applicable).`);
             logToFile(`   Verify '${serverConfig.config.command}' is correct and accessible after sourcing nvm (if used).`);
        } else if (errorMsg.includes('connect ECONNREFUSED')) {
             logToFile(`   ECONNREFUSED Detail: Connection refused. The MCP server process might have started but crashed immediately or isn't listening correctly.`);
        }
        logToFile(`   Troubleshooting tips for "${serverConfig.label}":`);
        logToFile(`     - Used Shell: ${shellExecutable}`);
        logToFile(`     - NVM Script Used: ${nvmScriptPath || 'Not found/used'}`);
        // Re-log the final command string for easier debugging
        logToFile(`     - Executed Command String (in shell): `);
        logToFile(`     - Can you manually run the 'Executed Command String' inside '${shellExecutable} -c "..."' in your regular terminal?`);
        logToFile(`     - Check PATH within that shell context. Is '${serverConfig.config.command}' reachable?`);
        logToFile(`     - Review the MCP server's own logs if possible.`);
      }
    }
  );

  await Promise.all(connectionPromises);

  // Generate combined Gemini tool list *after* all connections attempted
  if (allMcpTools.length > 0) {
    allGeminiTools = allMcpTools.map((tool) => ({
      name: tool.name,
      description: tool.description || "No description provided",
      parameters: convertMcpSchemaToGeminiSchema(tool.inputSchema),
    }));
    logToFile(`🔌 Total ${allMcpTools.length} MCP tools aggregated for Gemini from ${mcpClients.size} connected server(s).`);
  } else {
    logToFile("⚠️ No MCP tools were successfully loaded from any server via manual shell execution.");
  }

  logToFile(`connectToMcpServers finished. ${mcpClients.size} clients connected. ${toolToServerMap.size} tools mapped.`);

  // <<< MODIFIED RETURN VALUE >>>
  // Return the aggregated Gemini tools, the map of connected clients, and the tool-to-server mapping
  return { allGeminiTools, mcpClients, toolToServerMap }; // <-- RETURNING THE MAP
}

// --- END OF FILE getMcpTools.ts ---