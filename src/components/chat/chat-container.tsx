"use client";

import { useChat } from "@ai-sdk/react";
import { isToolUIPart, getToolName } from "ai";
import type { UIMessage } from "ai";
import { CopyIcon, RefreshCwIcon } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageToolbar,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import { getToolLabel } from "@/lib/tool-labels";
import { getToolSummary } from "@/lib/tool-summary";

type PartGroup =
  | { type: "single"; part: UIMessage["parts"][number]; index: number }
  | { type: "tool-group"; toolName: string; parts: { part: UIMessage["parts"][number]; index: number }[] };

function groupParts(parts: UIMessage["parts"]): PartGroup[] {
  const groups: PartGroup[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (isToolUIPart(part)) {
      const toolName = getToolName(part);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup?.type === "tool-group" && lastGroup.toolName === toolName) {
        lastGroup.parts.push({ part, index: i });
      } else {
        groups.push({ type: "tool-group", toolName, parts: [{ part, index: i }] });
      }
    } else {
      groups.push({ type: "single", part, index: i });
    }
  }

  return groups;
}

const SUGGESTIONS = [
  "Je veux creer une app de gestion de budget pour les etudiants",
  "Startup fintech de paiement fractionne en Europe",
  "Plateforme SaaS de collaboration pour architectes",
  "Marque de cosmetiques naturels et made in France",
];

function renderToolCard(part: UIMessage["parts"][number], i: number) {
  if (!isToolUIPart(part)) return null;
  const toolName = getToolName(part);
  const label = getToolLabel(toolName);
  return (
    <Tool key={i}>
      <ToolHeader
        title={label}
        type={part.type as "dynamic-tool"}
        state={part.state}
        toolName={toolName}
      />
      <ToolContent>
        {part.input !== undefined && <ToolInput input={part.input} />}
        {(part.state === "output-available" || part.state === "output-error") && (
          <ToolOutput output={part.output} errorText={part.errorText} />
        )}
      </ToolContent>
    </Tool>
  );
}

function MessageParts({ message }: { message: UIMessage }) {
  const groups = useMemo(() => groupParts(message.parts), [message.parts]);

  return (
    <MessageContent>
      {groups.map((group, gi) => {
        if (group.type === "single") {
          const { part, index: i } = group;

          if (part.type === "text") {
            if (message.role === "user") {
              return (
                <p key={i} className="whitespace-pre-wrap">
                  {part.text}
                </p>
              );
            }
            return <MessageResponse key={i}>{part.text}</MessageResponse>;
          }

          if (part.type === "reasoning") {
            return (
              <Reasoning key={i} isStreaming={part.state === "streaming"}>
                <ReasoningTrigger />
                <ReasoningContent>{part.text}</ReasoningContent>
              </Reasoning>
            );
          }

          return null;
        }

        // tool-group with single call → render as normal Tool card
        if (group.parts.length === 1) {
          return renderToolCard(group.parts[0].part, group.parts[0].index);
        }

        // tool-group with multiple calls → ChainOfThought
        const label = getToolLabel(group.toolName);
        const allDone = group.parts.every(
          (p) => isToolUIPart(p.part) && (p.part.state === "output-available" || p.part.state === "output-error")
        );

        return (
          <ChainOfThought key={`group-${gi}`} defaultOpen={false}>
            <ChainOfThoughtHeader>
              {label} ({group.parts.length}){" "}
              {allDone ? "\u2705 Termine" : "\u23F3 En cours..."}
            </ChainOfThoughtHeader>
            <ChainOfThoughtContent>
              {group.parts.map(({ part, index: i }) => {
                if (!isToolUIPart(part)) return null;
                const toolName = getToolName(part);
                const hasOutput = part.state === "output-available" || part.state === "output-error";
                const summary = getToolSummary(
                  toolName,
                  part.input as Record<string, unknown> | undefined,
                  hasOutput ? (part.output as Record<string, unknown> | undefined) : undefined,
                  hasOutput
                );
                return (
                  <ChainOfThoughtStep
                    key={i}
                    label={summary.label}
                    description={summary.description}
                    status={
                      hasOutput
                        ? "complete"
                        : part.state === "input-available"
                          ? "active"
                          : "pending"
                    }
                  />
                );
              })}
            </ChainOfThoughtContent>
          </ChainOfThought>
        );
      })}
    </MessageContent>
  );
}

export function ChatContainer() {
  const { messages, sendMessage, status, error, stop, regenerate } = useChat();

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="border-b border-border bg-background px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <h1 className="text-lg font-semibold text-foreground">BrandCheck</h1>
          <Badge variant="secondary">MVP</Badge>
        </div>
      </header>

      <Conversation>
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="BrandCheck"
              description="Decrivez votre projet et je vous aiderai a trouver le nom de marque ideal."
            >
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">BrandCheck</h3>
                  <p className="text-sm text-muted-foreground">
                    Decrivez votre projet et je vous aiderai a trouver le nom de
                    marque ideal.
                  </p>
                </div>
                <Suggestions>
                  {SUGGESTIONS.map((s) => (
                    <Suggestion
                      key={s}
                      suggestion={s}
                      onClick={(text) => sendMessage({ text })}
                    />
                  ))}
                </Suggestions>
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((message, messageIndex) => (
              <Message key={message.id} from={message.role}>
                <MessageParts message={message} />

                {message.role === "assistant" && (
                  <MessageToolbar>
                    <MessageActions>
                      <MessageAction
                        tooltip="Copier"
                        onClick={() => {
                          const text = message.parts
                            .filter(
                              (p): p is { type: "text"; text: string } =>
                                p.type === "text"
                            )
                            .map((p) => p.text)
                            .join("");
                          navigator.clipboard.writeText(text);
                        }}
                      >
                        <CopyIcon className="size-4" />
                      </MessageAction>
                      {messageIndex === messages.length - 1 &&
                        status === "ready" && (
                          <MessageAction
                            tooltip="Regenerer"
                            onClick={() => regenerate()}
                          >
                            <RefreshCwIcon className="size-4" />
                          </MessageAction>
                        )}
                    </MessageActions>
                  </MessageToolbar>
                )}
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {error && (
        <div className="border-t border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
          Une erreur est survenue. Veuillez reessayer.
        </div>
      )}

      <div className="border-t border-border bg-background p-4">
        <div className="mx-auto max-w-3xl">
          <PromptInput
            onSubmit={({ text }) => {
              if (!text.trim()) return;
              sendMessage({ text });
            }}
          >
            <PromptInputTextarea placeholder="Decrivez votre projet..." />
            <PromptInputFooter>
              <PromptInputSubmit status={status} onStop={stop} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
