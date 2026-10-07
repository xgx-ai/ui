import type { DialogContentProps } from "@xgx/ui";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DialogFooter,
  useResponseDialog,
} from "@xgx/ui";
import { createSignal, For, Show } from "solid-js";

/** Response dialogs opened back to back, and a host that can unmount while one is open. */
export function ResponseDialogLifecycleDemo() {
  const [hostMounted, setHostMounted] = createSignal(true);
  const [result, setResult] = createSignal("No response yet");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Response dialog lifecycle</CardTitle>
        <CardDescription>Chained responses and a host that unmounts mid-dialog.</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-3">
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setHostMounted((mounted) => !mounted)}>
            {hostMounted() ? "Unmount dialog host" : "Mount dialog host"}
          </Button>
          <Show when={hostMounted()}>
            <ResponseDialogHost onResult={setResult} />
          </Show>
        </div>
        <p data-testid="response-result" class="text-xs text-muted-foreground">
          {result()}
        </p>
      </CardContent>
    </Card>
  );
}

function ResponseDialogHost(props: { onResult: (result: string) => void }) {
  const { showResponseDialog, DialogResponse } = useResponseDialog();

  const archiveWithNote = async () => {
    const confirmed = await showResponseDialog<boolean>({
      title: "Archive record",
      description: "Archived records leave the active queue.",
      template: "alert",
      templateProps: { action: "Archive" },
    });
    props.onResult(`Archive: ${String(confirmed)}`);
    if (!confirmed) return;
    const note = await showResponseDialog<string>({
      title: "Archive note",
      content: (dialogProps) => <NoteForm dialogProps={dialogProps} label="Archive note" />,
    });
    props.onResult(`Archive note: ${note ?? "dismissed"}`);
  };

  const twoStepReview = async () => {
    const proceed = await showResponseDialog<boolean>({
      title: "Review step one",
      content: (dialogProps) => (
        <DialogFooter>
          <Button size="sm" onClick={() => dialogProps.resolve(true)}>
            Next step
          </Button>
        </DialogFooter>
      ),
    });
    if (!proceed) return;
    const note = await showResponseDialog<string>({
      title: "Review step two",
      content: (dialogProps) => <NoteForm dialogProps={dialogProps} label="Reviewer note" />,
    });
    props.onResult(`Review note: ${note ?? "dismissed"}`);
  };

  const longDetails = async () => {
    const details = await showResponseDialog<string>({
      title: "Long details",
      description: "Only the fields scroll; the title and buttons stay in view.",
      footerPlacement: "outside",
      content: (dialogProps) => <LongDetailsForm dialogProps={dialogProps} />,
    });
    props.onResult(`Long details: ${details ?? "dismissed"}`);
  };

  const pendingDecision = async () => {
    const decision = await showResponseDialog<boolean>({ title: "Pending decision" });
    props.onResult(`Pending decision: ${String(decision)}`);
  };

  return (
    <>
      <Button variant="outline" onClick={archiveWithNote}>
        Archive with note
      </Button>
      <Button variant="outline" onClick={twoStepReview}>
        Two step review
      </Button>
      <Button variant="outline" onClick={pendingDecision}>
        Pending decision
      </Button>
      <Button variant="outline" onClick={longDetails}>
        Long details
      </Button>
      <DialogResponse />
    </>
  );
}

function NoteForm(props: { dialogProps: DialogContentProps<string>; label: string }) {
  const [note, setNote] = createSignal("");
  return (
    <form
      class="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        props.dialogProps.resolve(note());
      }}
    >
      <input
        class="h-9 rounded-md border border-input bg-transparent px-3 text-xs"
        aria-label={props.label}
        value={note()}
        onInput={(event) => setNote(event.currentTarget.value)}
      />
      <DialogFooter>
        <Button type="submit" size="sm">
          Save note
        </Button>
      </DialogFooter>
    </form>
  );
}

const longDetailFields = Array.from({ length: 14 }, (_, index) => `Detail ${index + 1}`);

/** A form taller than the viewport whose footer sits below the scrolling body. */
function LongDetailsForm(props: { dialogProps: DialogContentProps<string> }) {
  const [first, setFirst] = createSignal("");
  return (
    <form
      class="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        props.dialogProps.resolve(first());
      }}
    >
      <For each={longDetailFields}>
        {(label, index) => (
          <input
            class="h-9 rounded-md border border-input bg-transparent px-3 text-xs"
            aria-label={label}
            onInput={(event) => {
              if (index() === 0) setFirst(event.currentTarget.value);
            }}
          />
        )}
      </For>
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={props.dialogProps.reject}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Save details
        </Button>
      </DialogFooter>
    </form>
  );
}
