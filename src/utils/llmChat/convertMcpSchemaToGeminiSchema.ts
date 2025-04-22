import {
    FunctionDeclaration,
    SchemaType,
} from "@google/generative-ai";
import { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js";
import McpPropertySchema from "./McpPropertySchema";

export function convertMcpSchemaToGeminiSchema(mcpSchema: McpTool['inputSchema']): FunctionDeclaration['parameters'] {
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