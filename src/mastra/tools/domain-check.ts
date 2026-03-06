import { tool } from "ai";
import { z } from "zod";

export const domainCheck = tool({
  description:
    "Check domain name availability for multiple TLDs (.com, .fr, .io) by attempting DNS resolution. Returns availability status for each domain.",
  inputSchema: z.object({
    name: z
      .string()
      .describe("The brand name to check (without TLD extension)"),
  }),
  execute: async ({ name }) => {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const tlds = ["com", "fr", "io"];

    const results = await Promise.all(
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

    return {
      name: cleanName,
      domains: results.map((r) => ({
        domain: r.domain,
        tld: r.tld,
        available: r.available,
      })),
    };
  },
});
