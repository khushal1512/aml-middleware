import {
  transactionLookup,
  transactionLookupSchema,
  transactionLookupDefinition,
} from "./transaction-lookup.js";
import {
  chainAnalysis,
  chainAnalysisSchema,
  chainAnalysisDefinition,
} from "./chain-analysis.js";
import {
  riskScoring,
  riskScoringSchema,
  riskScoringDefinition,
} from "./risk-scoring.js";
import {
  patternDetection,
  patternDetectionSchema,
  patternDetectionDefinition,
} from "./pattern-detection.js";
import {
  addressProfiling,
  addressProfilingSchema,
  addressProfilingDefinition,
} from "./address-profiling.js";
import {
  graphQuery,
  graphQuerySchema,
  graphQueryDefinition,
} from "./graph-query.js";

import type { ToolResult } from "../types/mcp.js";
import { logger } from "../utils/logger.js";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolHandler {
  definition: ToolDefinition;
  execute: (args: Record<string, unknown>) => ToolResult;
}

function createHandler(
  definition: ToolDefinition,
  schema: import("zod").ZodSchema,
  handler: (input: any) => ToolResult
): ToolHandler {
  return {
    definition,
    execute: (args: Record<string, unknown>): ToolResult => {
      try {
        const parsed = schema.parse(args);
        return handler(parsed);
      } catch (err: any) {
        logger.error("ToolRegistry", `Tool ${definition.name} error: ${err.message}`);
        return {
          content: [
            {
              type: "text",
              text: `Error executing ${definition.name}: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}

export const toolRegistry: Map<string, ToolHandler> = new Map();

// Register all tools
const tools: ToolHandler[] = [
  createHandler(
    transactionLookupDefinition,
    transactionLookupSchema,
    transactionLookup
  ),
  createHandler(chainAnalysisDefinition, chainAnalysisSchema, chainAnalysis),
  createHandler(riskScoringDefinition, riskScoringSchema, riskScoring),
  createHandler(
    patternDetectionDefinition,
    patternDetectionSchema,
    patternDetection
  ),
  createHandler(
    addressProfilingDefinition,
    addressProfilingSchema,
    addressProfiling
  ),
  createHandler(graphQueryDefinition, graphQuerySchema, graphQuery),
];

for (const tool of tools) {
  toolRegistry.set(tool.definition.name, tool);
}

export function getToolDefinitions(): ToolDefinition[] {
  return Array.from(toolRegistry.values()).map((h) => h.definition);
}

export function executeTool(
  name: string,
  args: Record<string, unknown>
): ToolResult {
  const handler = toolRegistry.get(name);
  if (!handler) {
    return {
      content: [
        {
          type: "text",
          text: `Unknown tool: "${name}". Available tools: ${Array.from(toolRegistry.keys()).join(", ")}`,
        },
      ],
      isError: true,
    };
  }
  return handler.execute(args);
}