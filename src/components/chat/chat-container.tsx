"use client";

import { useChat } from "@ai-sdk/react";
import { MessageList } from "./message-list";
import { InputBar } from "./input-bar";
import { Badge } from "@/components/ui/badge";

export function ChatContainer() {
  const { messages, sendMessage, status, error } = useChat();

  const isLoading = status === "streaming" || status === "submitted";

  const handleSubmit = (text: string) => {
    if (!text.trim()) return;
    sendMessage({ text });
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="border-b border-border bg-background px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <h1 className="text-lg font-semibold text-foreground">
            BrandCheck
          </h1>
          <Badge variant="secondary">MVP</Badge>
        </div>
      </header>
      <MessageList messages={messages} isLoading={isLoading} />
      {error && (
        <div className="border-t border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
          An error occurred. Please try again.
        </div>
      )}
      <InputBar onSubmit={handleSubmit} disabled={isLoading} />
    </div>
  );
}
