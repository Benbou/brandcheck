import { logger } from "@/lib/logger";

const INPI_BASE = "https://api-gateway.inpi.fr";

let cachedXsrfToken: string | null = null;
let cachedAccessToken: string | null = null;
let cachedRefreshToken: string | null = null;
let tokenExpiresAt = 0;

function extractCookieFromResponse(res: Response, name: string): string | null {
  // Try getSetCookie() first (standard API), fall back to set-cookie header
  const cookies = res.headers.getSetCookie?.() ?? [];
  const sources = cookies.length > 0
    ? cookies
    : (res.headers.get("set-cookie") ?? "").split(/,(?=\s*\w+=)/);

  for (const header of sources) {
    const match = header.match(new RegExp(`${name}=([^;]+)`));
    if (match) return match[1];
  }
  return null;
}

async function authenticate(): Promise<void> {
  const username = process.env.INPI_USERNAME;
  const password = process.env.INPI_PASSWORD;
  if (!username || !password) {
    throw new Error("INPI_USERNAME and INPI_PASSWORD must be set in environment variables");
  }

  // Step 1: Get XSRF token
  const csrfRes = await fetch(`${INPI_BASE}/services/uaa/api/authenticate`, {
    method: "GET",
    redirect: "manual",
  });
  cachedXsrfToken = extractCookieFromResponse(csrfRes, "XSRF-TOKEN");
  if (!cachedXsrfToken) {
    throw new Error("Failed to obtain XSRF-TOKEN from INPI");
  }

  // Step 2: Login — extract tokens from JSON body (more reliable than cookies in Next.js runtime)
  const loginRes = await fetch(`${INPI_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-XSRF-TOKEN": cachedXsrfToken,
      "Cookie": `XSRF-TOKEN=${cachedXsrfToken}`,
    },
    body: JSON.stringify({ username, password, rememberMe: true }),
  });

  if (!loginRes.ok) {
    throw new Error(`INPI login failed: ${loginRes.status}`);
  }

  const loginBody = await loginRes.json();
  cachedAccessToken = loginBody.access_token ?? null;
  cachedRefreshToken = loginBody.refresh_token ?? null;

  if (!cachedAccessToken) {
    throw new Error("Failed to obtain access_token from INPI login");
  }

  // Cache for 55 minutes (tokens typically expire after 1h)
  tokenExpiresAt = Date.now() + 55 * 60 * 1000;
  logger.debug("INPI authentication successful");
}

async function ensureAuthenticated(): Promise<void> {
  if (!cachedAccessToken || Date.now() >= tokenExpiresAt) {
    await authenticate();
  }
}

function buildAuthHeaders(): Record<string, string> {
  const cookieParts = [`XSRF-TOKEN=${cachedXsrfToken}`, `access_token=${cachedAccessToken}`];
  if (cachedRefreshToken) {
    cookieParts.push(`refresh_token=${cachedRefreshToken}`);
  }
  return {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "X-XSRF-TOKEN": cachedXsrfToken!,
    "Cookie": cookieParts.join("; "),
  };
}

export interface TrademarkResult {
  applicationNumber: string;
  mark: string;
  status: string;
  applicant: string;
}

export interface TrademarkSearchResponse {
  totalCount: number;
  results: TrademarkResult[];
  filteredByClasses: boolean;
}

export async function searchTrademarks(params: {
  name: string;
  collections?: ("FR" | "EU" | "WO")[];
  niceClasses?: number[];
  activeOnly?: boolean;
  size?: number;
}): Promise<TrademarkSearchResponse> {
  await ensureAuthenticated();

  const { name, collections = ["FR", "EU", "WO"], niceClasses, activeOnly = true, size = 20 } = params;

  // Build SolR query parts
  const queryParts: string[] = [`[Mark_Exp=${name}*]`];

  const filteredByClasses = !!(niceClasses && niceClasses.length > 0);
  if (filteredByClasses) {
    const classQuery = niceClasses!.join(" OU ");
    queryParts.push(`[ClassNumber=(${classQuery})]`);
  }

  if (activeOnly) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    queryParts.push(`[ExpiryDate=${today}:99991231]`);
  }

  const query = queryParts.join(" ET ");
  logger.debug("INPI search query", { query, collections, size });

  const doSearch = async () => {
    const res = await fetch(`${INPI_BASE}/services/apidiffusion/api/marques/search`, {
      method: "POST",
      headers: buildAuthHeaders(),
      body: JSON.stringify({ collections, query, size }),
    });
    return res;
  };

  let res = await doSearch();

  // If auth expired, retry once
  if (res.status === 401 || res.status === 403) {
    logger.warn("INPI auth expired, re-authenticating");
    cachedAccessToken = null;
    await ensureAuthenticated();
    res = await doSearch();
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`INPI search failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return parseResults(data, filteredByClasses);
}

function parseResults(data: any, filteredByClasses: boolean): TrademarkSearchResponse {
  const totalCount: number = data?.metadata?.count ?? 0;
  const items: any[] = data?.results ?? [];
  const results: TrademarkResult[] = [];

  for (const item of items) {
    const fields: { name: string; value: string }[] = item.fields ?? [];
    const fieldMap = new Map(fields.map((f) => [f.name, f.value]));

    results.push({
      applicationNumber: fieldMap.get("ApplicationNumber") ?? "",
      mark: fieldMap.get("Mark") ?? "",
      status: fieldMap.get("MarkCurrentStatusCode") ?? "",
      applicant: fieldMap.get("DEPOSANT") ?? "",
    });
  }

  return { totalCount, results, filteredByClasses };
}
