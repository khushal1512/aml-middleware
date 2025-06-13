import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { settings } from "./config/settings.js";
import { logger } from "./utils/logger.js";
import { getToolDefinitions, executeTool } from "./tools/index.js";
import {
  resourceDefinitions,
  readResource,
} from "./resources/index.js";
import {
  promptDefinitions,
  buildPromptMessages,
} from "./prompts/index.js";

export function createMCPServer(): Server {
  const server = new Server(
    {
      name: settings.serverName,
      version: settings.serverVersion,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // ─── LIST TOOLS ───────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug("MCP", "ListTools request received");
    const tools = getToolDefinitions();
    return {
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    };
  });

  // ─── CALL TOOL ────────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info("MCP", `CallTool: ${name}`, args);

    const result = executeTool(name, args ?? {});

    return {
      content: result.content,
      isError: result.isError,
    };
  });

  // ─── LIST RESOURCES ───────────────────────────────────
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    logger.debug("MCP", "ListResources request received");
    return {
      resources: resourceDefinitions.map((r) => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
      })),
    };
  });

  // ─── READ RESOURCE ────────────────────────────────────
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    logger.info("MCP", `ReadResource: ${uri}`);

    const resource = readResource(uri);
    if (!resource) {
      throw new Error(
        `Resource not found: ${uri}. Available: ${resourceDefinitions.map((r) => r.uri).join(", ")}`
      );
    }

    return {
      contents: [resource],
    };
  });

  // ─── LIST PROMPTS ────────────────────────────────────
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    logger.debug("MCP", "ListPrompts request received");
    return {
      prompts: promptDefinitions.map((p) => ({
        name: p.name,
        description: p.description,
        arguments: p.arguments,
      })),
    };
  });

  // ─── GET PROMPT ──────────────────────────────────────
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info("MCP", `GetPrompt: ${name}`, args);

    const messages = buildPromptMessages(name, (args as Record<string, string>) ?? {});

    return {
      description: promptDefinitions.find((p) => p.name === name)?.description ?? "",
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };
  });

  return server;
}