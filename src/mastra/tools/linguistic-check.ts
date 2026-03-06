import { tool } from "ai";
import { z } from "zod";

const NEGATIVE_WORDS: Record<string, string[]> = {
  fr: [
    "con",
    "cul",
    "merde",
    "pute",
    "bite",
    "nul",
    "mort",
    "mal",
    "laid",
    "rat",
    "peur",
    "faux",
    "noir",
    "sale",
    "vide",
    "fade",
  ],
  en: [
    "die",
    "dead",
    "kill",
    "hate",
    "shit",
    "fuck",
    "damn",
    "hell",
    "sick",
    "bad",
    "ugly",
    "fat",
    "dumb",
    "lame",
    "fail",
    "crap",
  ],
  es: [
    "culo",
    "puta",
    "mierda",
    "muerto",
    "malo",
    "feo",
    "tonto",
    "rata",
    "vago",
    "sucio",
  ],
};

export const linguisticCheck = tool({
  description:
    "Check a brand name for linguistic issues: length, pronunciation ease (vowel/consonant ratio), and potential negative meanings in French, English, and Spanish.",
  inputSchema: z.object({
    name: z.string().describe("The brand name to check"),
  }),
  execute: async ({ name }) => {
    const lower = name.toLowerCase();
    const issues: string[] = [];

    const vowels = lower.match(/[aeiouy]/g)?.length || 0;
    const consonants = lower.match(/[bcdfghjklmnpqrstvwxz]/g)?.length || 0;
    const ratio = consonants > 0 ? vowels / consonants : vowels;

    if (ratio < 0.3) {
      issues.push("Very low vowel ratio - may be hard to pronounce");
    }
    if (ratio > 2.5) {
      issues.push("Very high vowel ratio - may sound weak or unclear");
    }

    if (lower.length > 15) {
      issues.push("Name is very long (>15 chars) - hard to remember");
    }

    for (const [lang, words] of Object.entries(NEGATIVE_WORDS)) {
      for (const word of words) {
        if (lower.includes(word)) {
          const langName =
            lang === "fr"
              ? "French"
              : lang === "en"
                ? "English"
                : "Spanish";
          issues.push(
            `Contains "${word}" which has negative connotation in ${langName}`
          );
        }
      }
    }

    const consecutiveConsonants = lower.match(/[bcdfghjklmnpqrstvwxz]{4,}/);
    if (consecutiveConsonants) {
      issues.push(
        `Cluster of ${consecutiveConsonants[0].length} consecutive consonants ("${consecutiveConsonants[0]}") - difficult to pronounce`
      );
    }

    return {
      name,
      length: name.length,
      isShort: name.length <= 8,
      vowelConsonantRatio: Math.round(ratio * 100) / 100,
      issues,
    };
  },
});
