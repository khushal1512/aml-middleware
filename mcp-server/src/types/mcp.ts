export interface ToolInput {
  [key: string]: unknown;
}

export interface ToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

export interface ResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}