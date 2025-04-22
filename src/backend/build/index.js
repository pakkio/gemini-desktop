import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod"; // <-- Import ZodRawShape if needed for clarity, though not strictly required for the fix
// --- Server Definition ---
const server = new McpServer({
    name: "simple-tools-server",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});
// --- Tool Definitions ---
// 1. Echo Tool
server.tool("echo_message", "Takes a message from the user and echoes it back.", 
// ---- CHANGE HERE: Remove z.object() ----
{
    message: z.string().describe("The text message you want to be echoed."),
}, 
// ---- END CHANGE ----
async ({ message }) => {
    console.log(`[Tool:echo_message] Received message: ${message}`);
    const responseText = `You sent the message: "${message}"`;
    return {
        content: [
            {
                type: "text",
                text: responseText,
            },
        ],
    };
});
// 2. Add Numbers Tool
server.tool("add_numbers", "Calculates the sum of two numbers provided by the user.", 
// ---- CHANGE HERE: Remove z.object() ----
{
    number1: z.number().describe("The first number to add."),
    number2: z.number().describe("The second number to add."),
}, 
// ---- END CHANGE ----
async ({ number1, number2 }) => {
    console.log(`[Tool:add_numbers] Received numbers: ${number1}, ${number2}`);
    const sum = number1 + number2;
    const responseText = `The sum of ${number1} and ${number2} is ${sum}.`;
    return {
        content: [
            {
                type: "text",
                text: responseText,
            },
        ],
    };
});
// --- Server Startup Logic ---
async function main() {
    try {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("✅ Simple MCP Server is running and connected via stdio.");
        console.error("Available tools: echo_message, add_numbers");
        console.error("Waiting for client connections...");
    }
    catch (error) {
        console.error("❌ Fatal error starting or running the MCP server:", error);
        process.exit(1);
    }
}
// --- Entry Point ---
main();
