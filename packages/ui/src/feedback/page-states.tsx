import type { JSX } from "@solidjs/web";
import { splitProps } from "../utils/split-props";
import { Frown } from "../icons.index";
import { type ParentProps } from "solid-js";
import { cn } from "../cn";
import { Button } from "../forms/button";
import { Spinner } from "./spinner";

/**
 * Full-page loading state. Centers a spinner with optional message.
 * Use this as a Suspense fallback or loading state for page content.
 *
 * @example
 * ```tsx
 * <Suspense fallback={<PageLoading />}>
 *   <MyContent />
 * </Suspense>
 *
 * <Suspense fallback={<PageLoading>Loading documents...</PageLoading>}>
 *   <Documents />
 * </Suspense>
 * ```
 */
export interface PageLoadingProps extends ParentProps {
  class?: string;
}

export function PageLoading(props: PageLoadingProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div
      class={cn("flex h-full flex-col items-center justify-center gap-3", local.class)}
      {...rest}
    >
      <Spinner class="size-6" />
      {local.children && <span class="text-sm text-muted-foreground">{local.children}</span>}
    </div>
  );
}

/**
 * Full-page empty state. Centers an icon, title, description, and optional action.
 * Use this when a page or section has no content to display.
 *
 * @example
 * ```tsx
 * <PageEmpty
 *   icon={<Folder size={48} />}
 *   title="This folder is empty"
 *   description="Upload a file or create a folder to get started"
 *   action={<Button>Create folder</Button>}
 * />
 * ```
 */
export interface PageEmptyProps {
  class?: string;
  icon?: JSX.Element;
  title: string;
  description?: string;
  action?: JSX.Element;
}

export function PageEmpty(props: PageEmptyProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "icon", "title", "description", "action"]);

  return (
    <div
      class={cn("flex h-full flex-col items-center justify-center gap-2 p-8", local.class)}
      {...rest}
    >
      {local.icon && <div class="mb-2 text-muted-foreground">{local.icon}</div>}
      <h3 class="text-base font-medium text-foreground">{local.title}</h3>
      {local.description && (
        <p class="text-sm text-muted-foreground text-center max-w-sm">{local.description}</p>
      )}
      {local.action && <div class="mt-4">{local.action}</div>}
    </div>
  );
}

/**
 * Full-page error state. Centers an error title and message.
 * Use this when page content fails to load.
 *
 * @example
 * ```tsx
 * <PageError
 *   title="Error loading documents"
 *   message={error.message}
 *   action={<Button onClick={refetch}>Try again</Button>}
 * />
 * ```
 */
export interface PageErrorProps {
  class?: string;
  title?: string;
  message?: string;
  action?: JSX.Element;
}

export function PageError(props: PageErrorProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "title", "message", "action"]);

  return (
    <div
      class={cn("flex h-full flex-col items-center justify-center gap-2 p-8", local.class)}
      {...rest}
    >
      <h3 class="text-lg font-semibold text-error-foreground">
        {local.title ?? "Something went wrong"}
      </h3>
      {local.message && (
        <p class="text-sm text-muted-foreground text-center max-w-sm">{local.message}</p>
      )}
      {local.action && <div class="mt-4">{local.action}</div>}
    </div>
  );
}

/**
 * Full-page 404 not found state. Full-screen centered with icon, title,
 * description, and action.
 *
 * @example
 * ```tsx
 * <PageNotFound
 *   onGoHome={() => navigate({ to: "/" })}
 * />
 *
 * <PageNotFound
 *   title="Document not found"
 *   description="This document may have been deleted or moved."
 *   action={<Button onClick={goBack}>Go back</Button>}
 * />
 * ```
 */
export interface PageNotFoundProps {
  class?: string;
  title?: string;
  description?: string;
  action?: JSX.Element;
  /** Shorthand: renders a "Go home" button that calls this callback */
  onGoHome?: () => void;
}

export function PageNotFound(props: PageNotFoundProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "title", "description", "action", "onGoHome"]);

  return (
    <div
      class={cn("flex min-h-screen flex-col items-center justify-center gap-2 p-8", local.class)}
      {...rest}
    >
      <div class="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
        <Frown aria-hidden="true" class="size-8 text-muted-foreground" />
      </div>
      <h3 class="text-xl font-semibold text-foreground">{local.title ?? "Page not found"}</h3>
      <p class="text-sm text-muted-foreground text-center max-w-sm">
        {local.description ?? "The page you're looking for doesn't exist or has been moved."}
      </p>
      <div class="mt-4">
        {local.action ?? (local.onGoHome && <Button onClick={local.onGoHome}>Go home</Button>)}
      </div>
    </div>
  );
}
