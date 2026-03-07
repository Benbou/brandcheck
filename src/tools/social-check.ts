import { tool } from "ai";
import { z } from "zod";

const PLATFORMS = [
  { platform: "Instagram", urlTemplate: "https://www.instagram.com/{name}/" },
  { platform: "X", urlTemplate: "https://x.com/{name}" },
  { platform: "LinkedIn", urlTemplate: "https://www.linkedin.com/company/{name}/" },
  { platform: "TikTok", urlTemplate: "https://www.tiktok.com/@{name}" },
];

const TIMEOUT_MS = 3000;

export const socialCheck = tool({
  description:
    "Check social media handle availability on Instagram, X/Twitter, LinkedIn, and TikTok. Returns availability status for each platform (indicative — some platforms may block server-side requests).",
  inputSchema: z.object({
    name: z
      .string()
      .describe("The handle/username to check (without @)"),
  }),
  execute: async ({ name }) => {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9._-]/g, "");

    const platforms = await Promise.all(
      PLATFORMS.map(async ({ platform, urlTemplate }) => {
        const url = urlTemplate.replace("{name}", cleanName);
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

          const response = await fetch(url, {
            method: "HEAD",
            signal: controller.signal,
            redirect: "follow",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (compatible; BrandCheck/1.0; +https://brandcheck.app)",
            },
          });

          clearTimeout(timeout);

          // 404 = handle not taken = available
          const available = response.status === 404;

          return { platform, url, available };
        } catch {
          // Timeout or network error — cannot determine
          return { platform, url, available: null as boolean | null };
        }
      })
    );

    return { handle: cleanName, platforms };
  },
});
