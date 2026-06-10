import { Dynamic, type ComponentProps } from "@solidjs/web";
import type { JSX } from "@solidjs/web";
import { splitProps } from "../utils/split-props";
import { ArrowUp, Sparkles } from "../icons.index";
import MarkdownIt from "markdown-it";
import type { Component } from "solid-js";
import { createTrackedEffect, createSignal, For, Show } from "solid-js";

import { cn } from "../cn";

/**
 * # Chat
 *
 * Chat interface with message bubbles and input.
 *
 * @example
 * ```
 * <Chat
 *   title="AI Assistant"
 *   messages={[
 *     { id: "1", role: "user", content: "Hello!" },
 *     { id: "2", role: "assistant", content: "Hi there! How can I help?" },
 *   ]}
 *   onSendMessage={(msg) => console.log(msg)}
 *   placeholder="Type your message..."
 *   class="h-96"
 * />
 * ```
 */

// Configure markdown-it for safe rendering
const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
});

// Types
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

export interface ChatProps extends Omit<ComponentProps<"div">, "children"> {
  messages?: ChatMessage[];
  onSendMessage?: (message: string) => void;
  placeholder?: string;
  title?: string;
  icon?: JSX.Element;
  isLoading?: boolean;
  disabled?: boolean;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  footer?: JSX.Element;
  /** Display messages as plain text without bubble styling */
  noBubbles?: boolean;
  /** Center messages vertically instead of anchoring to bottom */
  centered?: boolean;
  /** Use a transparent/subtle background for the input area */
  transparentInput?: boolean;
}

// Regex to match hex colors
const hexColorRegex = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;

// Color swatch component for displaying colors inline
export const ColorSwatch: Component<{ color: string }> = (props) => {
  return (
    <span class="inline-flex items-center gap-1.5 font-mono text-xs align-middle">
      <span
        class="w-4 h-4 rounded border border-border-subtle shrink-0"
        style={{ "background-color": props.color }}
      />
      <span>{props.color}</span>
    </span>
  );
};

// Parse content into parts (text and colors) for JSX rendering
function parseContentWithColors(content: string): Array<{ type: "text" | "color"; value: string }> {
  const parts: Array<{ type: "text" | "color"; value: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(hexColorRegex.source, "g");
  match = regex.exec(content);
  while (match !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        value: content.slice(lastIndex, match.index),
      });
    }
    parts.push({ type: "color", value: match[0] });
    lastIndex = regex.lastIndex;
    match = regex.exec(content);
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  return parts;
}

function renderTextWithColors(content: string): JSX.Element {
  const parts = parseContentWithColors(content);
  return (
    <For each={parts}>
      {(part) => (
        <Show when={part.type === "color"} fallback={part.value}>
          <ColorSwatch color={part.value} />
        </Show>
      )}
    </For>
  );
}

function renderInlineTokens(tokens: NonNullable<ReturnType<typeof md.parseInline>[0]["children"]>) {
  const renderRange = (start: number, endType?: string): [JSX.Element[], number] => {
    const nodes: JSX.Element[] = [];
    let i = start;

    while (i < tokens.length) {
      const token = tokens[i];
      if (endType && token.type === endType) return [nodes, i + 1];

      if (token.nesting === 1) {
        const closeType = token.type.replace(/_open$/, "_close");
        const [children, next] = renderRange(i + 1, closeType);
        if (token.type === "strong_open") nodes.push(<strong>{children}</strong>);
        else if (token.type === "em_open") nodes.push(<em>{children}</em>);
        else if (token.type === "link_open") {
          const href = token.attrGet("href") ?? undefined;
          nodes.push(
            <a href={href} rel="noreferrer" target="_blank">
              {children}
            </a>,
          );
        } else nodes.push(<>{children}</>);
        i = next;
        continue;
      }

      if (token.type === "text") nodes.push(renderTextWithColors(token.content));
      else if (token.type === "code_inline") nodes.push(<code>{token.content}</code>);
      else if (token.type === "softbreak" || token.type === "hardbreak") nodes.push(<br />);
      i += 1;
    }

    return [nodes, i];
  };

  return renderRange(0)[0];
}

function MarkdownContent(props: { content: string; class?: string }) {
  const tokens = () => md.parse(props.content, {});

  const renderBlocks = (start: number, endType?: string): [JSX.Element[], number] => {
    const nodes: JSX.Element[] = [];
    const parsed = tokens();
    let i = start;

    while (i < parsed.length) {
      const token = parsed[i];
      if (endType && token.type === endType) return [nodes, i + 1];

      if (token.type === "inline") {
        nodes.push(<>{renderInlineTokens(token.children ?? [])}</>);
        i += 1;
        continue;
      }

      if (token.type === "paragraph_open") {
        const inline = parsed[i + 1];
        nodes.push(<p>{inline?.children ? renderInlineTokens(inline.children) : null}</p>);
        i += 3;
        continue;
      }

      if (token.type === "heading_open") {
        const inline = parsed[i + 1];
        nodes.push(
          <Dynamic component={token.tag}>
            {inline?.children ? renderInlineTokens(inline.children) : null}
          </Dynamic>,
        );
        i += 3;
        continue;
      }

      if (token.type === "bullet_list_open" || token.type === "ordered_list_open") {
        const [children, next] = renderBlocks(
          i + 1,
          token.type === "bullet_list_open" ? "bullet_list_close" : "ordered_list_close",
        );
        nodes.push(
          <Dynamic component={token.type === "bullet_list_open" ? "ul" : "ol"}>{children}</Dynamic>,
        );
        i = next;
        continue;
      }

      if (token.type === "list_item_open") {
        const [children, next] = renderBlocks(i + 1, "list_item_close");
        nodes.push(<li>{children}</li>);
        i = next;
        continue;
      }

      if (token.type === "blockquote_open") {
        const [children, next] = renderBlocks(i + 1, "blockquote_close");
        nodes.push(<blockquote>{children}</blockquote>);
        i = next;
        continue;
      }

      if (token.type === "fence" || token.type === "code_block") {
        nodes.push(
          <pre>
            <code>{token.content}</code>
          </pre>,
        );
      } else if (token.type === "hr") nodes.push(<hr />);

      i += 1;
    }

    return [nodes, i];
  };

  return <div class={props.class}>{renderBlocks(0)[0]}</div>;
}

// Message bubble component
export const ChatMessageBubble: Component<{ message: ChatMessage }> = (props) => {
  const isUser = () => props.message.role === "user";

  const renderUserContent = () => {
    const parts = parseContentWithColors(props.message.content);
    return (
      <p class="whitespace-pre-wrap">
        <For each={parts}>
          {(part) => (
            <Show when={part.type === "color"} fallback={part.value}>
              <ColorSwatch color={part.value} />
            </Show>
          )}
        </For>
      </p>
    );
  };

  return (
    <div class={cn("group flex flex-col w-full", isUser() ? "items-end" : "items-start")}>
      <div
        class={cn(
          "rounded-2xl px-4 py-2 text-sm",
          isUser() ? "bg-secondary text-secondary-foreground" : "bg-muted text-foreground",
        )}
      >
        <Show when={!isUser()} fallback={renderUserContent()}>
          <MarkdownContent
            class="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-2 prose-code:bg-surface-muted prose-code:px-1 prose-code:rounded text-inherit prose-headings:text-inherit prose-strong:text-inherit prose-p:text-inherit prose-li:text-inherit"
            content={props.message.content}
          />
        </Show>
      </div>
      <Show when={props.message.timestamp}>
        <span class="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity h-4">
          {props.message.timestamp?.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </Show>
    </div>
  );
};

// Plain message display without bubble styling
export const ChatMessagePlain: Component<{ message: ChatMessage }> = (props) => {
  const isUser = () => props.message.role === "user";

  const renderUserContent = () => {
    const parts = parseContentWithColors(props.message.content);
    return (
      <p class="whitespace-pre-wrap">
        <For each={parts}>
          {(part) => (
            <Show when={part.type === "color"} fallback={part.value}>
              <ColorSwatch color={part.value} />
            </Show>
          )}
        </For>
      </p>
    );
  };

  return (
    <div
      class={cn(
        "w-full text-lg",
        isUser() ? "text-right text-muted-foreground" : "text-foreground",
      )}
    >
      <Show when={!isUser()} fallback={renderUserContent()}>
        <MarkdownContent
          class="prose prose-lg max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-pre:my-3 prose-code:bg-muted prose-code:px-1 prose-code:rounded text-inherit prose-headings:text-inherit prose-strong:text-inherit prose-p:text-inherit prose-li:text-inherit"
          content={props.message.content}
        />
      </Show>
    </div>
  );
};

export const ChatTypingIndicator: Component = () => {
  return (
    <div class="flex justify-start">
      <div class="flex gap-1.5 px-1 py-2">
        <span
          class="h-2 w-2 animate-bounce rounded-full bg-muted-foreground opacity-30"
          style={{ "animation-delay": "0ms" }}
        />
        <span
          class="h-2 w-2 animate-bounce rounded-full bg-muted-foreground opacity-30"
          style={{ "animation-delay": "150ms" }}
        />
        <span
          class="h-2 w-2 animate-bounce rounded-full bg-muted-foreground opacity-30"
          style={{ "animation-delay": "300ms" }}
        />
      </div>
    </div>
  );
};

export const ChatInput: Component<{
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  rows?: number;
}> = (props) => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      props.onSubmit();
    }
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    props.onSubmit();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div class="flex items-center gap-2">
        <textarea
          value={props.value}
          onInput={(e) => props.onChange(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder={props.placeholder ?? "Type a message..."}
          rows={props.rows ?? 1}
          disabled={props.disabled}
          class={cn(
            "flex-1 resize-none bg-transparent text-lg",
            "placeholder:text-muted-foreground",
            "focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
        <button
          type="submit"
          disabled={!props.value.trim() || props.isLoading || props.disabled}
          class={cn(
            "inline-flex items-center justify-center rounded-full bg-secondary p-2",
            "text-secondary-foreground hover:bg-secondary",
            "focus-visible:outline-none",
            "disabled:pointer-events-none disabled:opacity-50",
            "transition-colors shrink-0",
          )}
        >
          <ArrowUp class="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};

export const Chat: Component<ChatProps> = (props) => {
  const [local, others] = splitProps(props, [
    "messages",
    "onSendMessage",
    "placeholder",
    "title",
    "icon",
    "isLoading",
    "disabled",
    "inputValue",
    "onInputChange",
    "footer",
    "class",
    "noBubbles",
    "centered",
    "transparentInput",
  ]);

  const [internalInputValue, setInternalInputValue] = createSignal("");

  // Use controlled or uncontrolled input
  const inputValue = () => local.inputValue ?? internalInputValue();
  const setInputValue = (value: string) => {
    if (local.onInputChange) {
      local.onInputChange(value);
    } else {
      setInternalInputValue(value);
    }
  };

  let messagesEndRef: HTMLDivElement | undefined;

  // Auto-scroll to bottom when messages change
  createTrackedEffect(() => {
    messages();
    local.isLoading;
    messagesEndRef?.scrollIntoView({ behavior: "smooth" });
  });

  const handleSendMessage = () => {
    const value = inputValue().trim();
    if (!value || !local.onSendMessage) return;
    local.onSendMessage(value);
    setInputValue("");
  };

  const messages = () => local.messages ?? [];

  const inputArea = (
    <div class={cn(local.centered ? "mt-6" : "px-4 pb-4 flex-shrink-0")}>
      <div
        class={cn(
          "rounded-2xl border border-border-subtle p-3",
          local.transparentInput ? "bg-transparent" : "bg-muted border border-border",
        )}
      >
        <Show when={!local.footer}>
          <ChatInput
            value={inputValue()}
            onChange={setInputValue}
            onSubmit={handleSendMessage}
            placeholder={local.placeholder}
            disabled={local.disabled}
            isLoading={local.isLoading}
          />
        </Show>
        <Show when={local.footer}>{local.footer}</Show>
      </div>
    </div>
  );

  return (
    <div
      class={cn("h-full w-full flex flex-col relative overflow-hidden", local.class)}
      {...others}
    >
      {/* Header */}
      <Show when={local.title}>
        <div class="p-3 shrink-0">
          <div class="flex items-center gap-2">
            {local.icon ?? <Sparkles class="w-4 h-4 text-secondary" />}
            <span class="text-sm font-medium">{local.title}</span>
          </div>
        </div>
      </Show>

      {/* Messages */}
      <div class="flex-1 min-h-0 overflow-y-auto p-4 scrollbar-thin fade-overflow">
        <div
          class={cn("min-h-full flex flex-col", local.centered ? "justify-center" : "justify-end")}
        >
          <div class="space-y-2">
            <For each={messages()}>
              {(message) => (
                <Show when={!local.noBubbles} fallback={<ChatMessagePlain message={message} />}>
                  <ChatMessageBubble message={message} />
                </Show>
              )}
            </For>
            <Show when={local.isLoading}>
              <ChatTypingIndicator />
            </Show>
            <div ref={messagesEndRef} />
          </div>
          {/* Input inside centered container */}
          <Show when={local.centered}>{inputArea}</Show>
        </div>
      </div>

      {/* Input Area - outside when not centered */}
      <Show when={!local.centered}>{inputArea}</Show>
    </div>
  );
};
