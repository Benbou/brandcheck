import {
  streamText,
  stepCountIs,
  convertToModelMessages,
  smoothStream,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { domainCheck } from "@/tools/domain-check";
import { rechercheEntreprises } from "@/tools/recherche-entreprises";
import { linguisticCheck } from "@/tools/linguistic-check";
import { scoringTool } from "@/tools/scoring";
import { socialCheck } from "@/tools/social-check";
import { inpiTrademarkCheck } from "@/tools/inpi-trademark-check";
import { getInstantDomainSearchTools } from "@/mcp/clients";
import { SYSTEM_PROMPT } from "@/prompts/brandcheck";
import { logger } from "@/lib/logger";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function loadMcpTools(label: string, loader: () => Promise<Record<string, any>>, timeoutMs: number): Promise<Record<string, any>> {
  try {
    const tools = await withTimeout(loader(), timeoutMs, label);
    logger.info(`${label} loaded`, Object.keys(tools));
    return tools;
  } catch (e) {
    logger.warn(`${label} failed to load`, e);
    return {};
  }
}

// Start loading MCP tools eagerly at module load
let mcpTools: Record<string, any> | null = null;

const mcpToolsPromise = loadMcpTools("Instant Domain Search MCP", getInstantDomainSearchTools, 10000)
  .then((domainTools) => {
    mcpTools = domainTools;
    logger.info("All MCP tools ready", Object.keys(mcpTools));
    return mcpTools;
  });

export async function POST(req: Request) {
  const { messages } = await req.json();
  const modelMessages = await convertToModelMessages(messages);

  // Wait for MCP tools if not yet ready (max 5s to avoid blocking too long)
  if (!mcpTools) {
    try {
      await withTimeout(mcpToolsPromise, 5000, "MCP tools initial load");
    } catch {
      logger.warn("MCP tools not ready after 5s, continuing with local tools only");
    }
  }
  const availableMcpTools = mcpTools ?? {};

  const allTools = {
    ...availableMcpTools,
    domainCheck,
    rechercheEntreprises,
    linguisticCheck,
    inpiTrademarkCheck,
    scoringTool,
    socialCheck,
  };
  logger.info("Tools passed to model", Object.keys(allTools));

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools: allTools,
    stopWhen: stepCountIs(15),
    experimental_transform: smoothStream({ chunking: "word" }),
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
}
