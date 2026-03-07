# BrandCheck

Conversational brand name verification tool. Users describe their project via chat, the AI asks scoping questions, generates 5 names, checks availability (domains, French companies, linguistics), and presents a scored report.

## Stack

- **Frontend**: Next.js 16 App Router + Tailwind CSS v4 + shadcn/ui + AI SDK v6 (`@ai-sdk/react` `useChat`)
- **Backend**: AI SDK v6 `streamText()` with custom tools + MCP clients, Claude Haiku via `@ai-sdk/anthropic`
- **No Mastra framework** — direct AI SDK integration for simplicity

## Key Files

- `src/app/api/chat/route.ts` — Main API route. Uses `streamText()` with local tools + MCP tools, `stopWhen: stepCountIs(15)` for multi-step tool calls. MCP tools loaded eagerly at module init; POST handler awaits them with 5s timeout to avoid race conditions.
- `src/tools/` — Custom AI SDK tools (local):
  - `domain-check.ts` — DNS-based domain availability (.com, .fr, .io) — fallback if MCP IDS unavailable
  - `recherche-entreprises.ts` — French company registry via `recherche-entreprises.api.gouv.fr`
  - `linguistic-check.ts` — Pronunciation heuristics, negative word detection (FR/EN/ES)
  - `inpi-trademark-check.ts` — INPI official API trademark search with Nice class filtering and conflict analysis
  - `scoring.ts` — Composite score 0-100 based on all checks (includes `trademarkRisk`)
  - `social-check.ts` — Social media handle availability (Instagram, X, LinkedIn, TikTok)
- `src/lib/inpi-client.ts` — INPI API client (`api-gateway.inpi.fr`). Cookie-based auth (XSRF + login), token caching, SolR query builder for trademark search.
- `src/mcp/clients.ts` — MCP client connection:
  - Instant Domain Search (`instantdomainsearch.com/mcp/streamable-http`) — PRIMARY for domain checks. Tools: `search_domains`, `generate_domain_variations`, `check_domain_availability`
- `src/prompts/brandcheck.ts` — System prompt for Haiku. MCP IDS = primary for domains (`domainCheck` = fallback). `inpiTrademarkCheck` for trademark verification.
- `src/components/chat/` — Chat UI (ChatContainer with useChat)
- `src/components/ai-elements/` — AI-specific UI components (tool display, reasoning, code blocks, etc.)
- `src/components/ui/` — shadcn/ui primitives (button, badge, scroll-area, avatar, card, dialog, tabs, tooltip, etc.)
- `src/app/globals.css` — Tailwind v4 + shadcn CSS variables + custom table styles
- `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)
- `src/lib/logger.ts` — Logging utility
- `src/lib/tool-labels.ts` — Human-readable labels for tool names
- `src/lib/tool-summary.ts` — Tool result summarization
- `src/app/page.tsx` — Mounts `ChatContainer`

## UI Components

- **shadcn/ui** with zinc base color, CSS variables for theming
- **react-markdown** + **remark-gfm** for rendering markdown tables in chat
- Dark mode via `.dark` class (shadcn convention)

## AI SDK v6 Conventions

This project uses AI SDK v6 which has breaking changes from v4/v5:
- `tool()` uses `inputSchema` (not `parameters`)
- `useChat()` returns `sendMessage({ text })` (not `handleSubmit`/`input`/`handleInputChange`)
- Messages are `UIMessage` with `.parts` array (not `.content` string)
- `stopWhen: stepCountIs(n)` replaces `maxSteps`
- `toUIMessageStreamResponse()` for streaming responses
- Import `useChat` from `@ai-sdk/react` (not `ai/react`)

## Commands

- `npm run dev` — Start dev server (port 3000)
- `npm run build` — Production build
- `npm run lint` — ESLint

## Environment

- `ANTHROPIC_API_KEY` in `.env.local`
- `INPI_USERNAME` in `.env.local` — INPI API account username
- `INPI_PASSWORD` in `.env.local` — INPI API account password
