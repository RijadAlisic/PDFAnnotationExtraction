// 1. THIS MUST BE THE VERY FIRST LINE
import "./suppress.js"; 

// 2. Then do the rest of your imports
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { getPdfContent, getPdfOutline, getPdfComments } from "./pdf-tools.js";


const server = new Server(
  { name: "thesis-reader", version: "1.0.0" },
  { capabilities: { tools: {} } }
);


// 1. Tell the AI what tools we have
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_pdf_outline",
      description: "Get the total page count and table of contents of a PDF.",
      inputSchema: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
    {
      name: "read_pdf_pages",
      description: "Read specific pages from a PDF, including text and comments.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          startPage: { type: "number" },
          endPage: { type: "number" },
        },
        required: ["path", "startPage", "endPage"],
      },
    },
    {
      name: "get_pdf_comments",
      description: "Extract only annotations/comments (highlights, sticky notes, free text) from a PDF page range, without the full page text. Cheaper than read_pdf_pages when you only need the comments.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          startPage: { type: "number" },
          endPage: { type: "number" },
        },
        required: ["path", "startPage", "endPage"],
      },
    },
  ],
}));

// 2. Handle the AI calling those tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "get_pdf_outline") {
    const data = await getPdfOutline(args?.path as string);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  if (name === "read_pdf_pages") {
    const text = await getPdfContent(
      args?.path as string,
      args?.startPage as number,
      args?.endPage as number
    );
    return { content: [{ type: "text", text }] };
  }

  if (name === "get_pdf_comments") {
    const text = await getPdfComments(
      args?.path as string,
      args?.startPage as number,
      args?.endPage as number
    );
    return { content: [{ type: "text", text }] };
  }

  throw new Error("Tool not found");
});

// 3. Start the server
const transport = new StdioServerTransport();
await server.connect(transport);