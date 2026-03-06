import { createMCPClient } from "@ai-sdk/mcp";

let instantDomainSearchClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;
let dataGouvClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;

export async function getInstantDomainSearchTools() {
  if (!instantDomainSearchClient) {
    instantDomainSearchClient = await createMCPClient({
      transport: {
        type: "sse",
        url: "https://instantdomainsearch.com/mcp/streamable-http",
      },
    });
  }
  const tools = instantDomainSearchClient.tools();
  console.log("[BrandCheck] Instant Domain Search tools:", Object.keys(tools));
  return tools;
}

export async function getDataGouvTools() {
  if (!dataGouvClient) {
    dataGouvClient = await createMCPClient({
      transport: {
        type: "sse",
        url: "https://mcp.data.gouv.fr/mcp",
      },
    });
  }
  const tools = dataGouvClient.tools();
  console.log("[BrandCheck] data.gouv.fr tools:", Object.keys(tools));
  return tools;
}
