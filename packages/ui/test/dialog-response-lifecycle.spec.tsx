import { createMemo, createRoot, flatten, flush, Loading, onCleanup, Show } from "solid-js";
import {
  createMutation,
  createQuery,
  query,
  queryGroup,
  QueryClient,
  QueryClientProvider,
  type UseMutationResult,
} from "../../query/src/index";
import { createResponseDialogState } from "../src/overlays/dialog/dialog-response-state";
import type { DialogContentProps } from "../src/overlays/dialog/dialog-response";

function equal(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`);
  }
}

async function settle() {
  flush();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  flush();
}

export default async function runDialogResponseLifecycleSpec() {
  const warnings: unknown[][] = [];
  const errors: unknown[][] = [];
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = (...args: unknown[]) => warnings.push(args);
  console.error = (...args: unknown[]) => errors.push(args);
  let dispose = () => {};
  let mutation: UseMutationResult<boolean, void> | undefined;
  let completeWrite: ((value: boolean) => void) | undefined;
  let failWrite: ((error: Error) => void) | undefined;
  let disposedChildren = 0;
  let mountedChildren = 0;
  const disposedOwners = new Set<number>();
  let failedWrites = 0;
  let acceptedWrites = 0;
  let queryFetches = 0;
  let parentRefreshed = false;
  const cache = new QueryClient();
  const totalQuery = queryGroup("response-dialog-test", {
    total: query({
      key: () => ({}),
      fetch: async () => {
        queryFetches++;
        return acceptedWrites;
      },
    }),
  }).total();
  const state = createRoot((cleanup) => {
    dispose = cleanup;
    const dialog = createResponseDialogState(() => null);
    function MutationContent(props: DialogContentProps<boolean>) {
      const ownerId = ++mountedChildren;
      onCleanup(() => {
        disposedChildren++;
        disposedOwners.add(ownerId);
      });
      mutation = createMutation(() => ({
        invalidates: () => [totalQuery],
        mutationFn: async () => {
          const value = await new Promise<boolean>((resolve, reject) => {
            completeWrite = resolve;
            failWrite = reject;
          });
          acceptedWrites++;
          return value;
        },
        onSuccess: (value) => props.resolve(value),
        onError: () => {
          failedWrites++;
        },
      }));
      return null;
    }
    let readTotal = () => undefined as number | undefined;
    function Total() {
      const result = createQuery(() => totalQuery);
      readTotal = result.cached;
      return <>{result.data()}</>;
    }
    function DialogBody() {
      return (
        <>
          {dialog.dialogProps.content?.({
            resolve: dialog.settleDialog,
            reject: () => dialog.settleDialog(null),
          })}
        </>
      );
    }
    // Keep the provider tree stable while its owned content opens and closes. This mirrors
    // DialogResponse's keyed mount; the real component needs a DOM and is exercised in the
    // browser by tests/response-dialog.spec.ts.
    const tree = (
      <QueryClientProvider client={cache}>
        <Loading fallback="Loading total">
          <Total />
        </Loading>
        <Show when={dialog.activeDialog()} keyed>
          <DialogBody />
        </Show>
      </QueryClientProvider>
    );
    return {
      dialog,
      readTotal: () => readTotal(),
      rendered: createMemo(() => flatten(tree)),
      content: (props: DialogContentProps<boolean>) => <MutationContent {...props} />,
    };
  });

  try {
    state.rendered();
    await settle();
    equal(state.readTotal(), 0, "the parent query starts from the server's value");
    const first = state.dialog.showResponseDialog<boolean>({
      title: "Create invoice",
      content: state.content,
      class: "invoice-dialog",
      template: "alert",
    });
    equal(
      state.dialog.showResponseDialog<boolean>({ title: "Duplicate open" }),
      first,
      "an open dialog retains one response promise",
    );
    await settle();
    equal(state.dialog.isOpen(), true, "the first dialog opens");
    const firstDialog = state.dialog.activeDialog();
    const firstOwnerId = mountedChildren;

    let parentResult: boolean | null | undefined;
    let second: Promise<boolean | null> | undefined;
    first.then(async (value) => {
      parentResult = value;
      second = state.dialog.showResponseDialog<boolean>({
        title: "Create another invoice",
        content: state.content,
      });
      await cache.invalidate(totalQuery);
      parentRefreshed = true;
    });
    void mutation?.mutateAsync().catch(() => {});
    equal(typeof completeWrite, "function", "the native mutation starts");
    completeWrite?.(true);
    await settle();
    equal(disposedOwners.has(firstOwnerId), true, "success disposes the mutation's content owner");
    equal(parentResult, true, "the disposed owner's caller receives its success");
    equal(failedWrites, 0, "a successful write emits no mutation error");
    equal(queryFetches >= 2, true, "success refetches the invalidated parent query");
    equal(state.readTotal(), 1, "automatic invalidation preserves the accepted server write");
    equal(parentRefreshed, true, "the fulfilled caller can await its own refresh");
    equal(second === first, false, "the next dialog receives a fresh promise");
    await settle();
    equal(state.dialog.isOpen(), true, "a second dialog opens after mutation success");
    equal(state.dialog.activeDialog() === firstDialog, false, "the second dialog has its own id");
    equal(
      state.dialog.dialogProps.template,
      undefined,
      "the next dialog does not inherit a template",
    );
    equal(state.dialog.dialogProps.class, undefined, "the next dialog does not inherit a class");
    equal(
      state.dialog.dialogProps.title,
      "Create another invoice",
      "the next dialog sets its title",
    );
    const disposedBeforeFailure = disposedChildren;
    const secondOwnerId = mountedChildren;
    const failedMutation = mutation?.mutateAsync().catch(() => null);
    failWrite?.(new Error("The write failed"));
    await failedMutation;
    await settle();
    equal(failedWrites, 1, "mutation errors reach the dialog's error callback");
    equal(state.dialog.isOpen(), true, "a failed write keeps its dialog open");
    equal(disposedChildren, disposedBeforeFailure, "a failed write preserves its content owner");
    state.dialog.settleDialog(null);
    equal(await second, null, "dismissal resolves the second caller");
    await settle();
    equal(disposedOwners.has(secondOwnerId), true, "dismissal also disposes the owned content");
    state.dialog.settleDialog(true);
    equal(await second, null, "late settlement cannot change a dismissed response");

    // Back-to-back: settling and reopening in one tick still swaps the mounted dialog.
    const third = state.dialog.showResponseDialog<boolean>({
      title: "Third",
      content: state.content,
    });
    await settle();
    const thirdDialog = state.dialog.activeDialog();
    const thirdOwnerId = mountedChildren;
    let fourth: Promise<boolean | null> | undefined;
    void third.then(() => {
      fourth = state.dialog.showResponseDialog<boolean>({
        title: "Fourth",
        content: state.content,
      });
    });
    state.dialog.settleDialog(true);
    await settle();
    equal(state.dialog.activeDialog() === thirdDialog, false, "an immediate reopen gets a new id");
    equal(disposedOwners.has(thirdOwnerId), true, "an immediate reopen disposes the old content");
    equal(mountedChildren, thirdOwnerId + 1, "an immediate reopen mounts fresh content");

    // Disposing the owner while a dialog is open resolves its caller.
    dispose();
    equal(await fourth, null, "owner disposal resolves the waiting caller with null");
    equal(warnings.length, 0, "the lifecycle emits no native warnings");
    equal(errors.length, 0, "the lifecycle emits no native errors");
    console.log("PASS response dialog settles across native mutation disposal and reopen");
  } finally {
    dispose();
    cache.removeQueries();
    console.warn = originalWarn;
    console.error = originalError;
  }
}

if (import.meta.main) await runDialogResponseLifecycleSpec();
