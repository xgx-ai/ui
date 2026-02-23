import { type JSX, type ParentProps, splitProps } from "solid-js";
import { cn } from "../cn";

export interface AuthPageProps extends ParentProps {
  class?: string;
}

/** Full-screen centered container for auth pages */
export function AuthPage(props: AuthPageProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div
      class={cn(
        "min-h-screen flex items-center justify-center bg-muted/30 p-4",
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
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={cn("mx-auto max-w-sm w-full", local.class)} {...rest}>
      {local.children}
    </div>
  );
}

export interface FullScreenCenterProps extends ParentProps {
  class?: string;
}

/** Full-screen flex center container */
export function FullScreenCenter(props: FullScreenCenterProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div
      class={cn("min-h-screen flex items-center justify-center", local.class)}
      {...rest}
    >
      {local.children}
    </div>
  );
}
