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
import { app } from "electron";
import which from "which"; // Ensure 'npm i --save-dev @types/which' is run

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
  const messageString =
    typeof message === "string" ? message : JSON.stringify(message, null, 2);
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

// --- Runner Path Discovery ---

let npxPath: string | null = null;
let uvxPath: string | null = null;

function findRunner(runnerName: "npx" | "uvx"): string | null {
  try {
    const runnerPath = which.sync(runnerName);
    logToFile(`Found '${runnerName}' executable at: ${runnerPath}`);
    return runnerPath;
  } catch (e) {
    logToFile(
      `⚠️ Could not find '${runnerName}' in the system PATH. MCP servers configured to use '${runnerName}' might fail.`
    );
    logToFile(
      `   Error details: ${e instanceof Error ? e.message : String(e)}`
    );
    if (runnerName === "npx") {
      logToFile(
        `   Please ensure Node.js (which includes npx) is installed and its 'bin' directory is in the system's PATH environment variable.`
      );
    } else if (runnerName === "uvx") {
      logToFile(
        `   Please ensure 'uv' (which includes uvx) is installed (e.g., via pip, brew, etc.) and its location is in the system's PATH.`
      );
    }
    return null; // Indicate not found
  }
}

// Find runners ONCE at startup
npxPath = findRunner("npx");
uvxPath = findRunner("uvx");

// --- Main Function ---

// <<< RETURN TYPE INCLUDES toolToServerMap >>>
export async function connectToMcpServers(): Promise<{
  allGeminiTools: FunctionDeclaration[];
  mcpClients: Map<string, McpClient>;
  toolToServerMap: Map<string, string>;
}> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const configPath = isPackaged
    ? path.join(app.getPath("userData"), "mcpServicesConfig.json")
    : path.join(
        __dirname,
        "../src/backend/configurations/mcpServicesConfig.json"
      );

  logToFile(`--- Starting connectToMcpServers ---`);
  logToFile(`Running in ${isPackaged ? "packaged" : "development"} mode.`);
  logToFile(`Attempting to load MCP config from: ${configPath}`);
  logToFile(`Detected npx path: ${npxPath || "Not Found"}`);
  logToFile(`Detected uvx path: ${uvxPath || "Not Found"}`);

  // Ensure the module-level maps are cleared at the start of each run
  mcpClients.clear();
  toolToServerMap.clear();
  allMcpTools = [];
  allGeminiTools = [];

  let data: string;
  try {
    if (isPackaged && !fs.existsSync(configPath)) {
      logToFile(
        `⚠️ MCP config file not found at ${configPath}. Creating default or skipping.`
      );
      // Optionally create a default config here if desired
      // fs.writeFileSync(configPath, JSON.stringify({ leftList: [] }, null, 2), 'utf-8');
      return {
        allGeminiTools: [],
        mcpClients: new Map(),
        toolToServerMap: new Map(),
      };
    }
    data = fs.readFileSync(configPath, "utf-8");
  } catch (readError: any) {
    logToFile(
      `❌ Failed to read MCP config file at ${configPath}: ${readError.message}`
    );
    return {
      allGeminiTools: [],
      mcpClients: new Map(),
      toolToServerMap: new Map(),
    };
  }

  if (!data) {
    logToFile("⚠️ MCP config file is empty or could not be read.");
    return {
      allGeminiTools: [],
      mcpClients: new Map(),
      toolToServerMap: new Map(),
    };
  }

  let parsedConfig;
  try {
    parsedConfig = JSON.parse(data);
  } catch (parseError: any) {
    logToFile(`❌ Failed to parse MCP config file: ${parseError.message}`);
    return {
      allGeminiTools: [],
      mcpClients: new Map(),
      toolToServerMap: new Map(),
    };
  }

  // Use optional chaining and provide a default empty array
  const serverConfigs = parsedConfig?.leftList || [];
  logToFile(`Found ${serverConfigs.length} server configurations.`);

  const connectionPromises = serverConfigs.map(
    async (serverConfig: {
      label: string;
      key: string;
      config: {
        env?: Record<string, string>;
        /**
         * The command to use for running the server.
         * Can be 'npx', 'uvx', or a full path to an executable.
         * If omitted, defaults to 'npx'.
         */
        command?: string;
        args: string[];
      };
    }) => {
      if (serverConfig.key === "mcp-unity") {
        serverConfig.config.args = serverConfig?.config?.env
          ?.ABSOLUTE_PATH_TO_BUILD
          ? [serverConfig?.config?.env?.ABSOLUTE_PATH_TO_BUILD]
          : [];
      }
      console.log(serverConfig,"serverConfig")
      if (!serverConfig.config || !Array.isArray(serverConfig.config.args)) {
        logToFile(
          `❌ Invalid configuration for server "${serverConfig.label}": Missing 'config' or 'args'. Skipping.`
        );
        return;
      }

      // --- Determine Command to Execute ---
      const configuredCommand = serverConfig.config.command;
      let commandToExecute: string | null = null;
      let runnerType: "npx" | "uvx" | "custom" | "default" = "default";

      if (configuredCommand === "npx") {
        commandToExecute = npxPath;
        runnerType = "npx";
        if (!commandToExecute)
          logToFile(
            `⚠️ Config for "${serverConfig.label}" specifies 'npx', but it was not found in PATH. Attempting to run 'npx' directly.`
          );
        commandToExecute = commandToExecute || "npx"; // Fallback to just 'npx'
      } else if (configuredCommand === "uvx") {
        commandToExecute = uvxPath;
        runnerType = "uvx";
        if (!commandToExecute)
          logToFile(
            `⚠️ Config for "${serverConfig.label}" specifies 'uvx', but it was not found in PATH. Attempting to run 'uvx' directly.`
          );
        commandToExecute = commandToExecute || "uvx"; // Fallback to just 'uvx'
      } else if (configuredCommand) {
        commandToExecute = configuredCommand; // Use custom command directly
        runnerType = "custom";
        logToFile(
          `Server "${serverConfig.label}" uses custom command: ${commandToExecute}`
        );
      } else {
        // Default to npx if command is not specified
        commandToExecute = npxPath;
        runnerType = "default";
        if (!commandToExecute) {
          logToFile(
            `⚠️ Config for "${serverConfig.label}" does not specify a command, defaulting to 'npx', but it was not found in PATH. Attempting to run 'npx' directly.`
          );
        } else {
          logToFile(
            `ℹ️ Config for "${serverConfig.label}" does not specify a command, defaulting to 'npx'. Consider adding '"command": "npx"' or '"command": "uvx"' to the config for clarity.`
          );
        }
        commandToExecute = commandToExecute || "npx"; // Fallback to just 'npx'
      }

      // --- Check if required runner executable was found (if using npx/uvx) ---
      if (
        (runnerType === "npx" || runnerType === "default") &&
        !npxPath &&
        configuredCommand !== "npx"
      ) {
        // Only fail if defaulting to npx AND npx wasn't found. If explicitly set to 'npx', we already logged a warning and will try the fallback 'npx'.
        logToFile(
          `❌ Skipping server "${serverConfig.label}" because it defaults to 'npx' runner, but 'npx' was not found in PATH.`
        );
        return;
      }
      if (runnerType === "uvx" && !uvxPath) {
        // Only fail if explicitly requesting uvx AND it wasn't found. We already logged a warning and will try the fallback 'uvx'.
        // However, it's safer to skip if the explicit runner wasn't found by `which`.
        logToFile(
          `❌ Skipping server "${serverConfig.label}" because it requires 'uvx' runner, but 'uvx' was not found in PATH.`
        );
        return;
      }
      // For custom commands, we assume the user provided a valid path/command.

      logToFile(
        `Processing server config: ${
          serverConfig.label
        } (Runner Type: ${runnerType}, Command: ${commandToExecute}, Args: ${JSON.stringify(
          serverConfig.config.args
        )})`
      );

      let transport: StdioClientTransport | null = null;

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
          command: commandToExecute, // Use the determined command
          args: serverConfig.config.args,
          env: filteredChildEnv as Record<string, string>,
          // cwd: serverConfig.cwd || undefined // If you need current working directory support
        };
        // --- End Parameters ---

        logToFile(
          `Attempting to start MCP server "${
            serverConfig.label
          }" with command: ${params.command} ${(params.args || []).join(" ")}`
        );

        transport = new StdioClientTransport(params);

        transport.onclose = () => {
          logToFile(`Transport explicitly closed for ${serverConfig.label}.`);
        };
        transport.onerror = (err) => {
          logToFile(
            `Transport error for ${serverConfig.label}: ${err.message}`
          );
        };

        const client = new McpClient({
          name: `mcp-gemini-backend-${serverConfig.key}`,
          version: "1.0.0",
        });

        await client.connect(transport);

        mcpClients.set(serverConfig.key, client);
        logToFile(
          `MCP Client connected for ${serverConfig.label}. Listing tools...`
        );

        const toolsResult = await client.listTools();
        const currentServerTools = toolsResult.tools;
        logToFile(
          `✅ Connected to "${serverConfig.key}" (${
            serverConfig.label
          }) using ${runnerType} runner with tools: ${currentServerTools
            .map((t) => t.name)
            .join(", ")}`
        );

        currentServerTools.forEach((tool) => {
          if (toolToServerMap.has(tool.name)) {
            logToFile(
              `⚠️ Tool name conflict: Tool "${tool.name}" from server "${
                serverConfig.key
              }" (${
                serverConfig.label
              }) overrides tool from server "${toolToServerMap.get(
                tool.name
              )}".`
            );
          }
          allMcpTools.push(tool);
          toolToServerMap.set(tool.name, serverConfig.key);
        });
      } catch (e: any) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        const errorStack = e instanceof Error ? `\nStack: ${e.stack}` : "";

        logToFile(`❌ Failed operation for MCP server "${serverConfig.label}"`);
        logToFile(`   Runner Type: ${runnerType}`);
        logToFile(`   Command Attempted: ${commandToExecute}`);
        logToFile(
          `   Arguments: ${JSON.stringify(serverConfig.config.args || [])}`
        );
        logToFile(`   Error: ${errorMsg}`);

        if (errorMsg.includes("ENOENT")) {
          logToFile(
            `   Hint: ENOENT usually means the command '${commandToExecute}' was not found or is not executable.`
          );
          if (runnerType === "npx" || runnerType === "default") {
            logToFile(
              `         - Is Node.js installed and 'npx' in the system PATH? (Found path: ${
                npxPath || "Not Found"
              })`
            );
          } else if (runnerType === "uvx") {
            logToFile(
              `         - Is 'uv' installed and 'uvx' in the system PATH? (Found path: ${
                uvxPath || "Not Found"
              })`
            );
          } else {
            // Custom command
            logToFile(
              `         - Is the custom command '${commandToExecute}' correct and executable/in PATH?`
            );
          }
        } else if (
          errorMsg.includes("closed") ||
          errorMsg.includes("ECONNREFUSED") ||
          errorMsg.includes("Transport closed")
        ) {
          logToFile(
            `   Hint: Connection closed/refused suggests the server process started but exited or crashed immediately.`
          );
          logToFile(
            `         - Check the server's own logs/output if possible.`
          );
          logToFile(
            `         - Check requirements (e.g., API keys in env: ${Object.keys(
              serverConfig.config.env || {}
            ).join(", ")})`
          );
          logToFile(
            `         - Try running the command manually in a terminal: ${commandToExecute} ${(
              serverConfig.config.args || []
            ).join(" ")}`
          );
        } else {
          logToFile(`   Stack: ${errorStack}`);
        }

        if (mcpClients.has(serverConfig.key)) {
          mcpClients.delete(serverConfig.key);
        }
        if (transport && typeof transport.close === "function") {
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
    logToFile(
      `🔌 Total ${allMcpTools.length} MCP tools aggregated for Gemini from ${mcpClients.size} connected server(s).`
    );
  } else {
    logToFile(
      "⚠️ No MCP tools were successfully loaded from any connected server."
    );
  }

  logToFile(
    `connectToMcpServers finished. ${mcpClients.size} clients connected. ${toolToServerMap.size} tools mapped.`
  );

  return { allGeminiTools, mcpClients, toolToServerMap };
}

// --- END OF FILE getMcpTools.ts ---
