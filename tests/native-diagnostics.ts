import type { Page } from "@playwright/test";

/**
 * Solid rc.11 runtime-correctness diagnostic codes. The demo dev server bundles Solid's
 * development build (`SolidPlugin` pins `solid.dev.js` and `@solidjs/signals` `dev.js`), so
 * these reach the browser console. Performance advisories are deliberately excluded.
 */
export const nativeDiagnosticPattern =
  /STRICT_READ_UNTRACKED|PENDING_ASYNC_UNTRACKED_READ|PENDING_ASYNC_FORBIDDEN_SCOPE|UNTRACKED_READ_AFTER_AWAIT|REACTIVE_WRITE_IN_OWNED_SCOPE|ASYNC_STORE_SETTER|ACTION_CALLED_IN_OWNED_SCOPE|FLUSH_IN_EFFECT_CALLBACK|FLUSH_IN_ACTION|NO_OWNER_EFFECT|NO_OWNER_BOUNDARY|NO_OWNER_CLEANUP|CLEANUP_IN_FORBIDDEN_SCOPE|SETTLED_CLEANUP_UNOWNED|RUN_WITH_DISPOSED_OWNER|MISSING_EFFECT_FN|PRIMITIVE_IN_FORBIDDEN_SCOPE|SYNC_NODE_RECEIVED_ASYNC|ASYNC_OUTSIDE_LOADING_BOUNDARY|LOADING_ON_OUTSIDE_HOLD|REACTIVITY_HALTED|INVARIANT_VIOLATION/;

/** Collects page errors and native Solid diagnostics for the rest of the test. */
export function watchNativeDiagnostics(page: Page) {
  const diagnostics: string[] = [];
  page.on("pageerror", (error) => diagnostics.push(error.message));
  page.on("console", (message) => {
    if (nativeDiagnosticPattern.test(message.text())) diagnostics.push(message.text());
  });
  return diagnostics;
}
