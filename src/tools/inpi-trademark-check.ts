import { tool } from "ai";
import { z } from "zod";
import { searchTrademarks } from "@/lib/inpi-client";
import { logger } from "@/lib/logger";

export const inpiTrademarkCheck = tool({
  description:
    "Search the official INPI trademark database for existing trademarks similar to a given name. Returns matching trademarks with their status and owner. When Nice classes are provided, results are filtered to those classes. Use this to check if a brand name conflicts with existing registered trademarks.",
  inputSchema: z.object({
    name: z.string().describe("The brand name to search for"),
    niceClasses: z
      .array(z.number().min(1).max(45))
      .optional()
      .describe(
        "Nice classification codes (1-45) relevant to the project. If provided, results are filtered to these classes."
      ),
  }),
  execute: async ({ name, niceClasses }) => {
    try {
      const response = await searchTrademarks({
        name,
        niceClasses,
        activeOnly: true,
        size: 20,
      });

      const exactMatches = response.results.filter(
        (r) => r.mark.toLowerCase() === name.toLowerCase()
      );
      const similarMatches = response.results.filter(
        (r) => r.mark.toLowerCase() !== name.toLowerCase()
      );

      // When classes were provided, matching results already overlap on those classes
      const classOverlap = response.filteredByClasses && response.totalCount > 0;

      let riskLevel: "high" | "medium" | "low" | "none";
      if (exactMatches.length > 0 && (classOverlap || !niceClasses?.length)) {
        riskLevel = "high";
      } else if (
        (exactMatches.length > 0 && !classOverlap) ||
        (similarMatches.length > 0 && classOverlap)
      ) {
        riskLevel = "medium";
      } else if (similarMatches.length > 0) {
        riskLevel = "low";
      } else {
        riskLevel = "none";
      }

      return {
        query: name,
        totalResults: response.totalCount,
        trademarks: response.results.map((t) => ({
          applicationNumber: t.applicationNumber,
          mark: t.mark,
          status: t.status,
          applicant: t.applicant,
        })),
        conflictAnalysis: {
          exactMatches: exactMatches.length,
          similarMatches: similarMatches.length,
          classOverlap,
          filteredByNiceClasses: niceClasses ?? [],
          riskLevel,
        },
      };
    } catch (error) {
      logger.error("INPI trademark check failed", error);
      return {
        query: name,
        totalResults: 0,
        trademarks: [],
        conflictAnalysis: {
          exactMatches: 0,
          similarMatches: 0,
          classOverlap: false,
          filteredByNiceClasses: niceClasses ?? [],
          riskLevel: "none" as const,
        },
        error: `INPI search failed: ${error instanceof Error ? error.message : String(error)}. Manual verification on inpi.fr is recommended.`,
      };
    }
  },
});
