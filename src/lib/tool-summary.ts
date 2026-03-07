export function getToolSummary(
  toolName: string,
  input: Record<string, unknown> | undefined,
  output: Record<string, unknown> | undefined,
  hasOutput: boolean
): { label: string; description: string } {
  const label = extractLabel(toolName, input);
  const description = hasOutput
    ? extractDescription(toolName, output)
    : "En cours...";
  return { label, description };
}

function extractLabel(
  toolName: string,
  input: Record<string, unknown> | undefined
): string {
  if (!input) return toolName;

  switch (toolName) {
    case "rechercheEntreprises":
      return String(input.query ?? toolName);
    case "linguisticCheck":
    case "scoringTool":
    case "socialCheck":
      return String(input.name ?? toolName);
    default:
      // MCP / unknown: first string value
      for (const val of Object.values(input)) {
        if (typeof val === "string" && val.length > 0) return val;
      }
      return toolName;
  }
}

function extractDescription(
  toolName: string,
  output: Record<string, unknown> | undefined
): string {
  if (!output) return "Termine";

  switch (toolName) {
    case "rechercheEntreprises": {
      const total = output.totalResults;
      return typeof total === "number" ? `${total} resultat${total !== 1 ? "s" : ""}` : "Termine";
    }
    case "linguisticCheck": {
      const issues = output.issues;
      if (Array.isArray(issues) && issues.length > 0) {
        return `${issues.length} probleme${issues.length !== 1 ? "s" : ""} detecte${issues.length !== 1 ? "s" : ""}`;
      }
      return "OK";
    }
    case "scoringTool": {
      const score = output.score;
      return typeof score === "number" ? `Score: ${score}/100` : "Termine";
    }
    case "socialCheck": {
      const platforms = output.platforms;
      if (!Array.isArray(platforms)) return "Termine";
      return platforms
        .map((p: { platform?: string; available?: boolean | null }) => {
          const icon = p.available === true ? "\u2705" : p.available === false ? "\u274C" : "\u2753";
          return `${p.platform}: ${icon}`;
        })
        .join("  ");
    }
    default:
      return "Termine";
  }
}
