import { createMCPClient } from "@ai-sdk/mcp";
import { logger } from "@/lib/logger";

let instantDomainSearchClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;

export async function getInstantDomainSearchTools() {
  if (!instantDomainSearchClient) {
    instantDomainSearchClient = await createMCPClient({
      transport: {
        type: "http",
        url: "https://instantdomainsearch.com/mcp/streamable-http",
      },
    });
  }
  const tools = await instantDomainSearchClient.tools();
  logger.debug("Instant Domain Search tools loaded", Object.keys(tools));
  return tools;
}
