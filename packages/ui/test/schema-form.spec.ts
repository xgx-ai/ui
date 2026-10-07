import { createRoot, createSignal, flush } from "solid-js";
import { z } from "zod";
import { createForm } from "../src/forms/schema-form/create-form.ts";

type SchemaFormFactory = typeof import("../src/forms/schema-form/form.tsx").createForm;
declare const createSchemaForm: SchemaFormFactory;

function equal(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
}

/**
 * Creates the form inside an owner, as a component would, then interacts from outside it, as
 * event handlers do. Writes inside the owned setup would be reactive-ownership errors.
 */
async function withForm<T>(setup: () => T, interact: (value: T) => void | Promise<void>) {
  let dispose = () => {};
  const value = createRoot((cleanup) => {
    dispose = cleanup;
    return setup();
  });
  try {
    await interact(value);
  } finally {
    dispose();
  }
}

/** Never called: reset values are checked against the schema's input type. */
export function typeChecks() {
  const schema = z.object({ name: z.string(), count: z.number().default(1) });
  // Initial values stay loose for existing callers that seed wider records.
  const form = createSchemaForm(schema, { initialValues: { name: "Ada", archived: true } });
  form.reset({ count: undefined });
  // @ts-expect-error reset values follow the schema's input type
  form.reset({ count: "1" });
}

async function humanisedMessages() {
  await withForm(
    () =>
      createForm(z.object({ reason: z.string().min(3, "Give a short reason") }), {
        initialValues: { reason: "" },
      }),
    (form) => {
      form.field("reason").onBlur();
      flush();
      equal(
        form.field("reason").errorMessage(),
        "Give a short reason",
        "explicit validation messages survive humanisation",
      );
    },
  );
  await withForm(
    () =>
      createForm(z.object({ name: z.string().min(1).describe("Name") }), {
        initialValues: { name: "" },
      }),
    (form) => {
      form.field("name").onBlur();
      flush();
      equal(
        form.field("name").errorMessage(),
        "Name is required",
        "default validation messages stay humanised",
      );
    },
  );
  await withForm(
    () =>
      createForm(z.object({ activity: z.string().describe("Activity") }), {
        initialValues: { activity: "meeting" },
      }),
    (form) => {
      // A cleared Select writes null into a required string field.
      form.field("activity").onInput(null as unknown as string);
      form.field("activity").onBlur();
      flush();
      equal(
        form.field("activity").errorMessage(),
        "Activity is required",
        "a cleared required field is humanised rather than reporting its type",
      );
    },
  );
  await withForm(
    () =>
      createForm(z.object({ count: z.number().describe("Count") }), {
        initialValues: { count: 1 },
      }),
    (form) => {
      form.field("count").onInput("many" as unknown as number);
      form.field("count").onBlur();
      flush();
      equal(
        form.field("count").errorMessage(),
        "Count must be a number",
        "a number field holding text is humanised",
      );
    },
  );
  await withForm(
    () =>
      createForm(
        z.object({ activity: z.string({ error: "Choose an activity" }).describe("Activity") }),
        { initialValues: { activity: "meeting" } },
      ),
    (form) => {
      form.field("activity").onInput(null as unknown as string);
      form.field("activity").onBlur();
      flush();
      equal(
        form.field("activity").errorMessage(),
        "Choose an activity",
        "an explicit type message still wins over humanisation",
      );
    },
  );
}

async function derivedValidation() {
  await withForm(
    () =>
      createForm(z.object({ prompt: z.string(), files: z.array(z.instanceof(File)) }), {
        initialValues: { prompt: "", files: [] },
      }),
    (form) => {
      equal(form.meta.files?.type, "object-array", "custom File schemas can be introspected");
    },
  );
  await withForm(
    () => {
      let parses = 0;
      const form = createForm(
        z.object({
          name: z.string().refine(() => {
            parses++;
            return true;
          }),
        }),
        { initialValues: { name: "" } },
      );
      return { form, parses: () => parses };
    },
    ({ form, parses }) => {
      form.isValid();
      const before = parses();
      form.field("name").onInput("Ada");
      form.field("name").onBlur();
      flush();
      form.isValid();
      form.field("name").errorMessage();
      equal(parses() - before, 1, "a change is parsed once for errors and validity");
    },
  );
  await withForm(
    () =>
      createForm(z.object({ first: z.string().min(1), second: z.string().min(1) }), {
        initialValues: { first: "", second: "" },
      }),
    (form) => {
      form.field("first").onBlur();
      form.field("second").onBlur();
      flush();
      form.field("first").onInput("one");
      form.field("second").onInput("two");
      flush();
      equal(form.field("first").value(), "one", "same-turn updates retain the first field");
      equal(form.field("second").value(), "two", "same-turn updates retain the second field");
      equal(form.isValid(), true, "both updated required fields are valid");
      equal(form.field("first").errorMessage(), undefined, "validation includes the first value");
      equal(form.field("second").errorMessage(), undefined, "validation includes the second value");
    },
  );
  await withForm(
    () =>
      createForm(z.object({ name: z.string().min(1).describe("Name") }), {
        initialValues: { name: "" },
        validateOnChange: false,
      }),
    (form) => {
      form.field("name").onBlur();
      flush();
      equal(form.field("name").errorMessage(), "Name is required", "blur validates");
      form.field("name").onInput("Ada");
      flush();
      equal(
        form.field("name").errorMessage(),
        "Name is required",
        "without change validation, errors wait for the next blur",
      );
      equal(form.isValid(), true, "validity still follows the current values");
      form.field("name").onBlur();
      flush();
      equal(form.field("name").errorMessage(), undefined, "the next blur re-validates");
    },
  );
}

async function submitValidation() {
  await withForm(
    () => {
      const schema = z.object({ activityId: z.string(), startDate: z.string(), notes: z.string() });
      const submitSchema = schema.refine(
        (values) => !values.activityId || Boolean(values.startDate),
        { message: "Activity type and start date are required", path: ["startDate"] },
      );
      return createForm(schema, {
        initialValues: { activityId: "meeting", startDate: "", notes: "" },
        submitSchema,
      });
    },
    async (form) => {
      equal(form.isValid(), false, "validity accounts for the submit schema");
      form.field("activityId").onBlur();
      flush();
      equal(
        form.field("startDate").errorMessage(),
        undefined,
        "cross-field validation waits for submit",
      );
      let submitted = false;
      await form.submit(() => {
        submitted = true;
      })();
      flush();
      equal(submitted, false, "invalid cross-field values never reach the submit handler");
      equal(
        form.field("startDate").errorMessage(),
        "Activity type and start date are required",
        "submit validation exposes the custom field error",
      );
      form.field("notes").onInput("Agenda to follow");
      flush();
      equal(
        form.field("startDate").errorMessage(),
        "Activity type and start date are required",
        "editing another field keeps the cross-field error",
      );
      form.field("startDate").onInput("2026-10-07");
      flush();
      equal(
        form.field("startDate").errorMessage(),
        undefined,
        "the cross-field error clears once the values satisfy it",
      );
      equal(form.isValid(), true, "corrected cross-field values are valid");
      await form.submit(() => {
        submitted = true;
      })();
      flush();
      equal(submitted, true, "corrected cross-field values submit successfully");
    },
  );
  await withForm(
    () =>
      createForm(z.object({ name: z.string() }), {
        initialValues: { name: " adam " },
        submitSchema: z.object({ name: z.string().trim().toUpperCase() }),
      }),
    async (form) => {
      let submittedName = "";
      await form.submit((values) => {
        submittedName = values.name;
      })();
      flush();
      equal(submittedName, "ADAM", "handlers receive the submit schema's parsed values");
    },
  );
  await withForm(
    () => createForm(z.object({ name: z.string() }), { initialValues: { name: "old" } }),
    async (form) => {
      form.field("name").onInput("new");
      let submittedName = "";
      await form.submit((values) => {
        submittedName = values.name;
      })();
      flush();
      equal(submittedName, "new", "same-turn field changes reach the submit handler");
      equal(form.field("name").value(), "new", "submit preserves pending field changes");
    },
  );
}

async function resetAndDisabled() {
  await withForm(
    () =>
      createForm(
        z.object({ name: z.string().min(1).describe("Name"), tags: z.array(z.string()) }),
        {
          initialValues: { name: "", tags: ["policy"] },
        },
      ),
    (form) => {
      equal(form.isDirty(), false, "initial values are clean, including arrays");
      form.field("name").onBlur();
      flush();
      equal(form.field("name").errorMessage(), "Name is required", "the empty name is invalid");
      // A profile whose session loads after the form was created.
      form.reset({ name: "Ada" });
      flush();
      equal(form.field("name").value(), "Ada", "reset applies the supplied values");
      equal(form.field("tags").value(), ["policy"], "reset keeps the other baseline values");
      equal(form.isDirty(), false, "reset values become the clean baseline");
      equal(form.field("name").errorMessage(), undefined, "reset clears touched fields");
      form.field("name").onInput("Grace");
      form.field("tags").onInput(["policy", "access"]);
      flush();
      equal(form.isDirty(), true, "edits after a reset are dirty");
      form.reset();
      flush();
      equal(form.field("name").value(), "Ada", "a plain reset returns to the rebased baseline");
      equal(form.field("tags").value(), ["policy"], "a plain reset restores replaced arrays");
      equal(form.isDirty(), false, "a plain reset is clean");
    },
  );
  await withForm(
    () => {
      const [locked, setLocked] = createSignal(true);
      const [busy, setBusy] = createSignal(false);
      const schema = z.object({ name: z.string() });
      return {
        accessorForm: createForm(schema, { disabled: locked }),
        getterForm: createForm(schema, {
          get disabled() {
            return busy();
          },
        }),
        setLocked,
        setBusy,
      };
    },
    ({ accessorForm, getterForm, setLocked, setBusy }) => {
      const accessorBinding = accessorForm.field("name");
      const getterBinding = getterForm.field("name");
      equal(accessorBinding.disabled, true, "an accessor disables fields");
      equal(getterBinding.disabled, false, "a getter is read when the field reads it");
      setLocked(false);
      setBusy(true);
      flush();
      equal(accessorBinding.disabled, false, "an existing binding follows the accessor");
      equal(getterBinding.disabled, true, "an existing binding follows the getter");
    },
  );
}

async function requiredMarkers() {
  await withForm(
    () =>
      createForm(
        z.object({
          name: z.string().min(1),
          email: z.string().email(),
          phone: z.string(),
          role: z.string().optional(),
          count: z.number(),
          notes: z.string().default(""),
        }),
        { initialValues: { name: "", email: "", phone: "", count: 1 } },
      ),
    (form) => {
      equal(
        ["name", "email", "phone", "role", "count", "notes"].map(
          (name) => form.field(name as never).required,
        ),
        [true, true, false, false, true, false],
        "only fields that reject an empty value are required",
      );
    },
  );
}

export default async function runSchemaFormSpec() {
  const reports: unknown[][] = [];
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = (...args: unknown[]) => reports.push(args);
  console.error = (...args: unknown[]) => reports.push(args);
  try {
    await humanisedMessages();
    await derivedValidation();
    await submitValidation();
    await resetAndDisabled();
    await requiredMarkers();
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
  }
  equal(reports.map(String), [], "schema forms emit no native warnings or errors");
  console.log(
    "ok - schema-form: humanised messages, derived validation, submit, reset, disabled and required",
  );
}

if (import.meta.main) await runSchemaFormSpec();
