import {
  streamText,
  stepCountIs,
  convertToModelMessages,
  smoothStream,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { rechercheEntreprises } from "@/mastra/tools/recherche-entreprises";
import { linguisticCheck } from "@/mastra/tools/linguistic-check";
import { scoringTool } from "@/mastra/tools/scoring";
import { domainCheck } from "@/mastra/tools/domain-check";
import {
  getInstantDomainSearchTools,
  getDataGouvTools,
} from "@/mastra/mcp/clients";

const SYSTEM_PROMPT = `Tu es BrandCheck, un expert en naming de marque. Tu aides les utilisateurs a trouver le nom parfait pour leur projet.

## Ton comportement

Tu parles en francais. Tu es professionnel mais accessible. Tu guides l'utilisateur etape par etape.

## Phase 1 - Discovery

Quand l'utilisateur decrit son projet, pose 3-4 questions de cadrage AVANT de generer des noms :
1. Quel est le secteur d'activite et le public cible ?
2. Quelle tonalite souhaitee ? (fun, premium, tech, organique, minimaliste...)
3. Quels marches vises ? (France, Europe, international ?)
4. Y a-t-il des contraintes specifiques ? (longueur max, sons a eviter, mots a inclure...)

Pose ces questions de facon naturelle et conversationnelle, pas comme un formulaire. Tu peux les regrouper en 1-2 messages.

## Phase 2 - Generation + Verification (MEME TURN, NE T'ARRETE PAS)

Une fois les reponses obtenues, genere exactement 5 noms de marque. Pour chaque nom, indique :
- Le nom
- Une justification en 1-2 phrases
- La technique de naming utilisee (neologisme, portmanteau, metaphore, acronyme, mot etranger, etc.)

Des que tu as genere les 5 noms, lance IMMEDIATEMENT les verifications pour chaque nom sans attendre de reponse de l'utilisateur. Ne t'arrete pas entre la generation et la verification. Tu dois TOUJOURS appeler les tools dans le meme message que la generation des noms. Ne demande JAMAIS confirmation avant de lancer les verifications.

Pour CHAQUE nom genere, lance systematiquement les verifications suivantes :
1. **Domaines** : Utilise les outils MCP Instant Domain Search pour verifier la disponibilite des .com, .fr et .io. Si un domaine .com est pris, utilise les outils MCP Instant Domain Search pour chercher des alternatives (ex: withnom.com, getnom.com, nomapp.com, trynom.com). Si les outils MCP ne sont pas disponibles, utilise le fallback domainCheck.
2. **Entreprises FR** : Utilise l'outil rechercheEntreprises pour chercher si une entreprise francaise porte ce nom
3. **Marques INPI** : Utilise les outils MCP data.gouv.fr pour chercher dans les bases de donnees de marques INPI si le nom est deja depose
4. **Linguistique** : Utilise l'outil linguisticCheck pour verifier les problemes potentiels
5. **Score** : Utilise l'outil scoringTool pour calculer un score composite a partir des resultats obtenus

## Phase 4 - Rapport

Presente les resultats sous forme de rapport structure en markdown :

Pour chaque nom, presente :
- Le nom en gras avec son score sur 100
- Disponibilite des domaines (.com, .fr, .io) avec des indicateurs visuels (utilise des emojis). Si le .com est pris, propose les alternatives trouvees (withnom.com, getnom.com, etc.)
- Resultat de la recherche entreprises FR
- Resultat de la recherche marques INPI
- Notes linguistiques
- Forces et faiblesses

Termine par un classement general et une recommandation.

## Phase 5 - Iteration

Apres le rapport :
- Propose de generer des alternatives si aucun nom ne convient
- Propose de creuser un nom specifique si l'utilisateur le souhaite
- Reste ouvert aux ajustements de criteres

## Regles importantes
- Ne genere JAMAIS de noms sans avoir pose les questions de cadrage d'abord
- Lance TOUJOURS toutes les verifications pour chaque nom
- Sois honnete sur les limites : les verifications de domaines sont indicatives (basees sur DNS), une verification INPI officielle est recommandee
- Si un outil echoue, mentionne-le dans le rapport au lieu de bloquer`;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function getMcpTools() {
  const results: Record<string, any> = {};

  try {
    const domainTools = await withTimeout(getInstantDomainSearchTools(), 10000, "Instant Domain Search MCP");
    Object.assign(results, domainTools);
  } catch (e) {
    console.warn("Failed to connect to Instant Domain Search MCP:", e);
  }

  try {
    const gouvTools = await withTimeout(getDataGouvTools(), 30000, "data.gouv.fr MCP");
    Object.assign(results, gouvTools);
  } catch (e) {
    console.warn("Failed to connect to data.gouv.fr MCP:", e);
  }

  return results;
}

let cachedMcpTools: Record<string, any> | null = null;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const modelMessages = await convertToModelMessages(messages);

  if (!cachedMcpTools) {
    cachedMcpTools = await getMcpTools();
    console.log(
      "[BrandCheck] MCP tools loaded:",
      Object.keys(cachedMcpTools)
    );
  }

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools: {
      ...cachedMcpTools,
      domainCheck,
      rechercheEntreprises,
      linguisticCheck,
      scoringTool,
    },
    stopWhen: stepCountIs(15),
    experimental_transform: smoothStream({ chunking: "word" }),
  });

  return result.toUIMessageStreamResponse();
}
