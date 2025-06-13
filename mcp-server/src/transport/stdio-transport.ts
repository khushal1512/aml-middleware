import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { logger } from "../utils/logger.js";

export function createStdioTransport(): StdioServerTransport {
  logger.info("Transport", "Creating STDIO transport for MCP");
  return new StdioServerTransport();
}