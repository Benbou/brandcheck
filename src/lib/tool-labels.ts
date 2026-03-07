const TOOL_LABELS: Record<string, string> = {
  rechercheEntreprises: "Recherche d'entreprises francaises",
  linguisticCheck: "Analyse linguistique",
  scoringTool: "Calcul du score",
  socialCheck: "Verification reseaux sociaux",
  inpiTrademarkCheck: "Recherche de marques (INPI)",
  // MCP tools — add known names here as they're discovered
  check: "Verification de domaine (instantdomainsearch)",
};

export function getToolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] ?? toolName;
}
