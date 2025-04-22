interface McpPropertySchema {
    type: string;
    description?: string;
    items?: McpPropertySchema | { type: string };
    properties?: { [key: string]: McpPropertySchema };
    required?: string[];
}

export default McpPropertySchema