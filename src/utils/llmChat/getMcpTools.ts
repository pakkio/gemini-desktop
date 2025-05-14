// --- START OF FILE getMcpTools.ts ---

import { convertMcpSchemaToGeminiSchema } from "./convertMcpSchemaToGeminiSchema";
import fs from "fs";
import os from "os";
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
import which from "which";

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
  const messageString =
    typeof message === "string" ? message : JSON.stringify(message, null, 2);
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

// Find npx path ONCE
let npxPath: string | null = null;
try {
  npxPath = which.sync("npx");
  logToFile(`Found 'npx' executable via which.sync at: ${npxPath}`);
} catch (e) {
  logToFile(
    `⚠️ Could not find 'npx' in the system PATH (via which.sync). Error: ${
      e instanceof Error ? e.message : String(e)
    }`
  );
  logToFile(
    `   Please ensure Node.js (which includes npx) is installed and its 'bin' directory is in the system's PATH environment variable.`
  );
  logToFile(`   Falling back to using 'npx' directly.`);
  npxPath = "npx"; // Fallback
}

// --- Constants for uv and uvx discovery ---
const platform = os.platform();
const uvxExecutableName = platform === "win32" ? "uvx.exe" : "uvx";
const uvExecutableName = platform === "win32" ? "uv.exe" : "uv";

let resourcesBinPath: string;
if (app.isPackaged) {
  resourcesBinPath = path.join(process.resourcesPath, "bin");
} else {
  // In development, resources/bin might be relative to app root
  resourcesBinPath = path.join(app.getAppPath(), "resources", "bin");
}
const potentialBundledUvPath = path.join(resourcesBinPath, uvExecutableName);
const potentialBundledUvxPath = path.join(resourcesBinPath, uvxExecutableName);

// Find uv path ONCE (for 'uv' command itself)
let uvPath: string | null = null;
logToFile("--- Initializing uv path discovery (for 'uv' command) ---");
logToFile(
  `(uv command) Resources bin path for bundled executables: ${resourcesBinPath}`
);

// 1. Try to find bundled uv
let foundBundledUv = false;
try {
  logToFile(
    `(uv command) Checking for bundled '${uvExecutableName}' at: ${potentialBundledUvPath}`
  );
  fs.accessSync(potentialBundledUvPath, fs.constants.X_OK); // Check uv exists and is executable
  uvPath = potentialBundledUvPath;
  foundBundledUv = true;
  logToFile(
    `✅ (uv command) Successfully found BUNDLED '${uvExecutableName}' at: ${uvPath}`
  );
} catch (uvCheckError) {
  logToFile(
    `(uv command) Bundled '${uvExecutableName}' not found or not executable at '${potentialBundledUvPath}'. Error: ${
      uvCheckError instanceof Error
        ? uvCheckError.message
        : String(uvCheckError)
    }`
  );
}

// 2. If bundled uv not found, try finding uv in system PATH
if (!foundBundledUv) {
  logToFile(
    "(uv command) Bundled 'uv' not resolved. Attempting to find 'uv' in system PATH..."
  );
  try {
    uvPath = which.sync("uv");
    logToFile(
      `(uv command) Found 'uv' executable via which.sync in system PATH at: ${uvPath}`
    );
  } catch (e) {
    logToFile(
      `⚠️ (uv command) Could not find 'uv' in the system PATH (via which.sync). Error: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
    logToFile(
      `   Please ensure 'uv' is installed (e.g., via pipx or pip) and its location is in the system's PATH, or bundle it correctly.`
    );
    logToFile(`   (uv command) Falling back to using 'uv' directly.`);
    uvPath = "uv"; // Fallback
  }
}
logToFile(`--- (uv command) Final resolved uv path: ${uvPath} ---`);

// Find uvx path ONCE (uses common constants defined above)
let uvxPath: string | null = null;
logToFile("--- Initializing uvx path discovery ---");
logToFile(
  `(uvx command) Resources bin path for bundled executables: ${resourcesBinPath}`
);

// 1. Try to find bundled uvx (and its 'uv' dependency)
let foundBundledUvx = false;
try {
  logToFile(
    `(uvx command) Checking for bundled '${uvxExecutableName}' at: ${potentialBundledUvxPath}`
  );
  fs.accessSync(potentialBundledUvxPath, fs.constants.X_OK); // Check uvx exists and is executable
  logToFile(
    `(uvx command) Found bundled '${uvxExecutableName}'. Checking for its dependency '${uvExecutableName}' at: ${potentialBundledUvPath}`
  );
  try {
    fs.accessSync(potentialBundledUvPath, fs.constants.X_OK); // Check uv dependency exists and is executable
    uvxPath = potentialBundledUvxPath;
    foundBundledUvx = true;
    logToFile(
      `✅ (uvx command) Successfully found BUNDLED '${uvxExecutableName}' (and verified '${uvExecutableName}' dependency at '${potentialBundledUvPath}') at: ${uvxPath}`
    );
  } catch (uvDependencyCheckError) {
    logToFile(
      `⚠️ (uvx command) Found bundled '${uvxExecutableName}', but its required dependency '${uvExecutableName}' is missing or not executable at '${potentialBundledUvPath}'. Error: ${
        uvDependencyCheckError instanceof Error
          ? uvDependencyCheckError.message
          : String(uvDependencyCheckError)
      }`
    );
    logToFile(
      `   Ensure both '${uvExecutableName}' and '${uvxExecutableName}' are in '${resourcesBinPath}' and executable.`
    );
  }
} catch (uvxCheckError) {
  logToFile(
    `(uvx command) Bundled '${uvxExecutableName}' not found or not executable at '${potentialBundledUvxPath}'. Error: ${
      uvxCheckError instanceof Error
        ? uvxCheckError.message
        : String(uvxCheckError)
    }`
  );
}

// 2. If bundled uvx not found or 'uv' dependency missing, try finding uvx in system PATH
if (!foundBundledUvx) {
  logToFile(
    "(uvx command) Bundled 'uvx' (with 'uv' dependency) not resolved. Attempting to find 'uvx' in system PATH..."
  );
  try {
    uvxPath = which.sync("uvx");
    logToFile(
      `(uvx command) Found 'uvx' executable via which.sync in system PATH at: ${uvxPath}`
    );
  } catch (e) {
    logToFile(
      `⚠️ (uvx command) Could not find 'uvx' in the system PATH (via which.sync). Error: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
    logToFile(
      `   Please ensure 'uv' (which includes uvx) is installed and its location is in the system's PATH, or bundle it correctly.`
    );
    logToFile(`   (uvx command) Falling back to using 'uvx' directly.`);
    uvxPath = "uvx"; // Fallback
  }
}
logToFile(`--- (uvx command) Final resolved uvx path: ${uvxPath} ---`);

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
    : path.join(
        __dirname,
        "../src/backend/configurations/mcpServicesConfig.json"
      );

  logToFile(`--- Starting connectToMcpServers ---`);
  logToFile(`Running in ${isPackaged ? "packaged" : "development"} mode.`);
  logToFile(`Attempting to load MCP config from: ${configPath}`);
  logToFile(`NPM Executable Path (npx): ${npxPath}`);
  logToFile(`UVX Executable Path (uvx): ${uvxPath}`);
  logToFile(`UV Executable Path (uv): ${uvPath}`);

  mcpClients.clear();
  toolToServerMap.clear();
  allMcpTools = [];
  allGeminiTools = [];

  let data: string;
  try {
    if (isPackaged && !fs.existsSync(configPath)) {
      logToFile(
        `⚠️ MCP config file not found at ${configPath}. No servers will be started.`
      );
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

  const serverConfigs = parsedConfig?.leftList || [];
  logToFile(`Found ${serverConfigs.length} server configurations.`);

  const connectionPromises = serverConfigs.map(
    async (serverConfig: {
      label: string;
      key: string;
      config: {
        env?: Record<string, string>;
        command?: string; // Can be "npx", "uvx", "uv", or a full path
        args: string[];
      };
    }) => {
      if (serverConfig.key === "mcp-unity") {
        serverConfig.config.args = serverConfig?.config?.env
          ?.ABSOLUTE_PATH_TO_BUILD
          ? [serverConfig?.config?.env?.ABSOLUTE_PATH_TO_BUILD]
          : [];
      }
      if (serverConfig.key === "reddit") {
        if (serverConfig?.config?.env?.PATH_OF_GITHUB_REPO) {
          serverConfig.config.args.splice(
            1,
            0,
            serverConfig?.config?.env?.PATH_OF_GITHUB_REPO
          );
        }
      }

      if (!webSearch && serverConfig.key === "brave-search") {
        logToFile(
          `Skipping server "${serverConfig.label}" (key: ${serverConfig.key}) because webSearch is false.`
        );
        return;
      }
      if (!serverConfig.config || !Array.isArray(serverConfig.config.args)) {
        logToFile(JSON.stringify(serverConfig, null, 2));
        logToFile(
          `❌ Invalid configuration for server "${serverConfig.label}": Missing 'config' or 'args'. Skipping.`
        );
        return;
      }

      let specificCommand: string;
      let runnerType: string; // For logging

      if (serverConfig.config.command === "uvx") {
        specificCommand = uvxPath || "uvx";
        runnerType = "uvx";
        if (
          specificCommand === "uvx" &&
          (uvxPath === "uvx" || uvxPath === null)
        ) {
          logToFile(
            `Server "${serverConfig.label}": Using 'uvx' directly as a specific path for uvx (bundled or system) was not found or resolved.`
          );
        }
      } else if (serverConfig.config.command === "uv") {
        specificCommand = uvPath || "uv";
        runnerType = "uv";
        if (specificCommand === "uv" && (uvPath === "uv" || uvPath === null)) {
          logToFile(
            `Server "${serverConfig.label}": Using 'uv' directly as a specific path for 'uv' (bundled or system) was not found or resolved.`
          );
        }
      } else if (
        serverConfig.config.command &&
        serverConfig.config.command !== "npx"
      ) {
        // Custom command (neither 'npx', 'uvx', nor 'uv' explicitly)
        specificCommand = serverConfig.config.command;
        runnerType = "custom";
      } else {
        // Default to npx or if command is 'npx' or command is undefined
        specificCommand = npxPath || "npx";
        runnerType = "npx";
        if (
          specificCommand === "npx" &&
          (npxPath === "npx" || npxPath === null)
        ) {
          logToFile(
            `Server "${serverConfig.label}": Config command is '${
              serverConfig.config.command || "default to npx"
            }', using 'npx' directly as a full path was not found.`
          );
        }
      }

      // Warnings for using fallback string commands if full paths weren't resolved
      if (
        runnerType === "npx" &&
        specificCommand === "npx" &&
        (npxPath === "npx" || npxPath === null)
      ) {
        logToFile(
          `⚠️ Server "${serverConfig.label}" (npx runner): Attempting to use 'npx' command directly as a full path was not found. ` +
            `This relies on 'npx' being in the OS's PATH for the packaged app, which may not be the case.`
        );
      }
      if (
        runnerType === "uvx" &&
        specificCommand === "uvx" &&
        (uvxPath === "uvx" || uvxPath === null)
      ) {
        logToFile(
          `⚠️ Server "${serverConfig.label}" (uvx runner): Attempting to use 'uvx' command directly as a full path (bundled or system) was not found. ` +
            `This relies on 'uvx' being in the OS's PATH for the packaged app.`
        );
      }
      if (
        runnerType === "uv" &&
        specificCommand === "uv" &&
        (uvPath === "uv" || uvPath === null)
      ) {
        logToFile(
          `⚠️ Server "${serverConfig.label}" (uv runner): Attempting to use 'uv' command directly as a full path (bundled or system) was not found. ` +
            `This relies on 'uv' being in the OS's PATH for the packaged app.`
        );
      }

      logToFile(
        `Processing server config: ${
          serverConfig.label
        } (Runner: ${runnerType}, Command: ${specificCommand}, Args: ${JSON.stringify(
          serverConfig.config.args
        )})`
      );

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
          }) using ${runnerType} with tools: ${currentServerTools
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
        logToFile(`   Command Attempted: ${specificCommand}`);
        logToFile(
          `   Arguments: ${JSON.stringify(serverConfig.config.args || [])}`
        );
        logToFile(`   Error: ${errorMsg}`);

        if (errorMsg.includes("ENOENT")) {
          logToFile(
            `   Hint: ENOENT usually means the command '${specificCommand}' was not found or is not executable.`
          );
          if (runnerType === "npx") {
            logToFile(
              `         - For npx: Is Node.js installed and 'npx' (resolved to '${npxPath}') in the system PATH accessible to the app?`
            );
          } else if (runnerType === "uvx") {
            logToFile(
              `         - For uvx: Was 'uvx' (resolved to '${uvxPath}') found bundled (with 'uv' dependency in '${resourcesBinPath}') or in system PATH accessible to the app?`
            );
            logToFile(
              `         - If bundled, ensure 'uv' & 'uvx' are in '${resourcesBinPath}' and executable.`
            );
          } else if (runnerType === "uv") {
            logToFile(
              `         - For uv: Was 'uv' (resolved to '${uvPath}') found bundled (in '${resourcesBinPath}') or in system PATH accessible to the app?`
            );
            logToFile(
              `         - If bundled, ensure 'uv' is in '${resourcesBinPath}' and executable.`
            );
          } else {
            // Custom command
            logToFile(
              `         - If using a custom command, is '${specificCommand}' correct and in PATH or an absolute path?`
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
            `         - Check the server's own logs/output if possible (e.g., if it's a script, add logging).`
          );
          if (runnerType === "uvx") {
            logToFile(
              `         - If using 'uvx', this can happen if 'uvx' starts but the underlying 'uv' command fails or the target MCP script (e.g. 'blender-mcp') crashes.`
            );
          } else if (runnerType === "uv") {
            logToFile(
              `         - If using 'uv', this can happen if 'uv' starts but the script it's supposed to run (e.g., via 'uv run ...') fails or crashes.`
            );
          }
          logToFile(
            `         - Check requirements (e.g., API keys in env: ${Object.keys(
              serverConfig.config.env || {}
            ).join(", ")})`
          );
          logToFile(
            `         - Try running the command manually in a terminal: ${specificCommand} ${(
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
