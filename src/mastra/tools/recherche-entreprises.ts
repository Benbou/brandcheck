import { tool } from "ai";
import { z } from "zod";

export const rechercheEntreprises = tool({
  description:
    "Search for French companies by name using the official recherche-entreprises.api.gouv.fr API. Returns matching companies from the French business registry (RNE).",
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
    url.searchParams.set("per_page", String(limit));

    const response = await fetch(url.toString());

    if (!response.ok) {
      return { totalResults: 0, companies: [] };
    }

    const data = await response.json();
    const results = data.results || [];

    return {
      totalResults: data.total_results || 0,
      companies: results.map(
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
        })
      ),
    };
  },
});
