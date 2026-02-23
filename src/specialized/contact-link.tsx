import type { JSX, ParentProps } from "solid-js";
import { Show, splitProps } from "solid-js";
import { cn } from "../cn.ts";

export type ContactLinkType = "phone" | "email";

export interface ContactLinkProps
  extends ParentProps<
    Omit<JSX.AnchorHTMLAttributes<HTMLAnchorElement>, "href">
  > {
  /** The phone number or email address */
  value: string | null | undefined;
  /** The type of contact link */
  type: ContactLinkType;
  /** Fallback text when value is null/undefined. Defaults to "—" */
  fallback?: string;
}

/**
 * A reusable component for rendering clickable phone (tel:) and email (mailto:) links.
 * Automatically formats the href based on the type prop.
 */
export function ContactLink(props: ContactLinkProps) {
  const [local, others] = splitProps(props, [
    "value",
    "type",
    "fallback",
    "class",
    "children",
  ]);

  const getHref = () => {
    if (!local.value) return undefined;
    return local.type === "phone"
      ? `tel:${local.value.replace(/\s/g, "")}`
      : `mailto:${local.value}`;
  };

  return (
    <Show when={local.value} fallback={<span>{local.fallback ?? "—"}</span>}>
      <a
        href={getHref()}
        class={cn(
          "text-primary hover:underline hover:text-primary/80 transition-colors",
          local.class,
        )}
        {...others}
      >
        {local.children ?? local.value}
      </a>
    </Show>
  );
}
