import { tool } from "ai";
import { z } from "zod";

/**
 * Simple similarity: ratio of longest common substring to max length.
 */
function similarity(a: string, b: string): number {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  if (al === bl) return 1;

  let longest = 0;
  for (let i = 0; i < al.length; i++) {
    for (let len = 1; len <= al.length - i; len++) {
      const sub = al.substring(i, i + len);
      if (bl.includes(sub) && len > longest) {
        longest = len;
      }
    }
  }
  return longest / Math.max(al.length, bl.length);
}

export const rechercheEntreprises = tool({
  description:
    "Search for French companies by name using the official recherche-entreprises.api.gouv.fr API. Returns matching companies from the French business registry (RNE), filtered to only include names similar to the query.",
  inputSchema: z.object({
    query: z.string().describe("Company name to search for"),
    limit: z
      .number()
      .optional()
      .default(5)
      .describe("Maximum number of results to return"),
  }),
  execute: async ({ query, limit }) => {
    const url = new URL(
      "https://recherche-entreprises.api.gouv.fr/search"
    );
    url.searchParams.set("q", query);
    url.searchParams.set("per_page", String(Math.min(limit * 3, 25)));

    const response = await fetch(url.toString());

    if (!response.ok) {
      return { totalResults: 0, companies: [] };
    }

    const data = await response.json();
    const results = data.results || [];

    const companies = results
      .map(
        (r: {
          nom_complet?: string;
          siren?: string;
          activite_principale?: string;
          nature_juridique?: string;
          etat_administratif?: string;
        }) => ({
          nom_complet: r.nom_complet || "",
          siren: r.siren || "",
          activite_principale: r.activite_principale || "",
          nature_juridique: r.nature_juridique || "",
          etat_administratif: r.etat_administratif || "",
          similarity: similarity(query, r.nom_complet || ""),
        })
      )
      .filter(
        (c: { similarity: number }) => c.similarity >= 0.5
      )
      .slice(0, limit);

    return {
      totalResults: companies.length,
      totalUnfiltered: data.total_results || 0,
      companies,
    };
  },
});
