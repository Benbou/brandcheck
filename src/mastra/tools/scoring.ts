import { tool } from "ai";
import { z } from "zod";

export const scoringTool = tool({
  description:
    "Calculate a composite availability score (0-100) for a brand name based on domain availability, company registry results, linguistic check, and name length.",
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
  }),
  execute: async ({
    name,
    comAvailable,
    frAvailable,
    ioAvailable,
    companyMatches,
    linguisticIssues,
    nameLength,
  }) => {
    const domainCom = comAvailable ? 30 : 0;
    const domainFr = frAvailable ? 10 : 0;
    const domainIo = ioAvailable ? 10 : 0;
    const noCompanyConflict = companyMatches === 0 ? 20 : 0;
    const noLinguisticIssue = linguisticIssues === 0 ? 20 : 0;
    const shortName = nameLength <= 8 ? 10 : 0;

    const score =
      domainCom +
      domainFr +
      domainIo +
      noCompanyConflict +
      noLinguisticIssue +
      shortName;

    return {
      name,
      score,
      breakdown: {
        domainCom,
        domainFr,
        domainIo,
        noCompanyConflict,
        noLinguisticIssue,
        shortName,
      },
    };
  },
});
