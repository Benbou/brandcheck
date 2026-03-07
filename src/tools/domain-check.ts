import { tool } from "ai";
import { z } from "zod";

/**
 * DNS-based domain availability check via Google DNS.
 * Used as local fallback when MCP Instant Domain Search is unavailable.
 */
export const domainCheck = tool({
  description:
    "Check domain name availability for .com, .fr and .io extensions using DNS lookup. Returns availability status for each TLD.",
  inputSchema: z.object({
    name: z
      .string()
      .describe("The brand name to check (without TLD, e.g. 'nombl')"),
  }),
  execute: async ({ name }) => {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const tlds = ["com", "fr", "io"];

    const domains = await Promise.all(
      tlds.map(async (tld) => {
        const domain = `${cleanName}.${tld}`;
        try {
          const response = await fetch(
            `https://dns.google/resolve?name=${domain}&type=A`
          );
          const data = await response.json();
          const hasDNS = data.Answer && data.Answer.length > 0;
          return { domain, tld, available: !hasDNS };
        } catch {
          return { domain, tld, available: null as boolean | null };
        }
      })
    );

    return { name: cleanName, domains };
  },
});
