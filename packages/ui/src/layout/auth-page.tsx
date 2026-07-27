import type { JSX } from "@solidjs/web";
import { omit, type ParentProps } from "solid-js";
import { cn } from "../cn";

export interface AuthPageProps extends ParentProps {
  class?: string;
}

/** Full-screen centered container for auth pages */
export function AuthPage(props: AuthPageProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "children");
  return (
    <div
      class={cn(
        "flex min-h-screen items-center justify-center bg-background p-4 text-foreground",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}

export interface AuthCardProps extends ParentProps {
  class?: string;
}

/** Max-width card container for auth forms */
export function AuthCard(props: AuthCardProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "children");
  return (
    <div
      class={cn(
        "mx-auto w-full max-w-sm rounded-lg border border-border-subtle bg-surface-raised p-6 text-surface-raised-foreground shadow-elevation-medium",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}

export interface FullScreenCenterProps extends ParentProps {
  class?: string;
}

/** Full-screen flex center container */
export function FullScreenCenter(props: FullScreenCenterProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "children");
  return (
    <div
      class={cn(
        "flex min-h-screen items-center justify-center bg-background text-foreground",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}
