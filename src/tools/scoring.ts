import { tool } from "ai";
import { z } from "zod";

export const scoringTool = tool({
  description:
    "Calculate a composite availability score (0-100) for a brand name based on domain availability, company registry results, linguistic check, social media handles, trademark risk, and name length.",
  inputSchema: z.object({
    name: z.string().describe("The brand name"),
    comAvailable: z
      .boolean()
      .describe("Whether the .com domain is available"),
    frAvailable: z
      .boolean()
      .describe("Whether the .fr domain is available"),
    ioAvailable: z
      .boolean()
      .describe("Whether the .io domain is available"),
    companyMatches: z
      .number()
      .describe("Number of matching French companies found"),
    linguisticIssues: z
      .number()
      .describe("Number of linguistic issues found"),
    nameLength: z.number().describe("Length of the name in characters"),
    socialHandleAvailable: z
      .number()
      .describe(
        "Number of social media platforms where the handle is available (0-4)"
      ),
    trademarkRisk: z
      .enum(["none", "low", "medium", "high"])
      .optional()
      .describe(
        "Trademark conflict risk level from INPI check (none, low, medium, high)"
      ),
  }),
  execute: async ({
    name,
    comAvailable,
    frAvailable,
    ioAvailable,
    companyMatches,
    linguisticIssues,
    nameLength,
    socialHandleAvailable,
    trademarkRisk,
  }) => {
    // Domains: .com = 20, .fr = 8, .io = 4 (was 25+10+5=40, now 32)
    const domainCom = comAvailable ? 20 : 0;
    const domainFr = frAvailable ? 8 : 0;
    const domainIo = ioAvailable ? 4 : 0;

    // Company conflicts: 0 = 18pts, 1-2 = 9pts, 3+ = 0pts (was 20)
    const companyConflict =
      companyMatches === 0 ? 18 : companyMatches <= 2 ? 9 : 0;

    // Linguistic: 0 issues = 13pts, 1 = 7pts, 2 = 3pts, 3+ = 0pts (was 15)
    const linguisticScore =
      linguisticIssues === 0
        ? 13
        : linguisticIssues === 1
          ? 7
          : linguisticIssues === 2
            ? 3
            : 0;

    const shortName = nameLength <= 8 ? 8 : 0;
    const socialScore = Math.round(
      13 * (Math.min(socialHandleAvailable, 4) / 4)
    );

    // Trademark risk: none = 10, low = 7, medium = 3, high = 0
    const trademarkScore =
      !trademarkRisk || trademarkRisk === "none"
        ? 10
        : trademarkRisk === "low"
          ? 7
          : trademarkRisk === "medium"
            ? 3
            : 0;

    const score =
      domainCom +
      domainFr +
      domainIo +
      companyConflict +
      linguisticScore +
      shortName +
      socialScore +
      trademarkScore;

    return {
      name,
      score,
      breakdown: {
        domainCom,
        domainFr,
        domainIo,
        companyConflict,
        linguisticScore,
        shortName,
        socialScore,
        trademarkScore,
      },
    };
  },
});
