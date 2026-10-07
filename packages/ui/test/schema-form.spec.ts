import { createRoot, flush } from "solid-js";
import { z } from "zod";
import { createForm } from "../src/forms/schema-form/create-form.ts";

function equal(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
}

async function withRoot(run: () => void | Promise<void>) {
  let dispose = () => {};
  const result = createRoot((cleanup) => {
    dispose = cleanup;
    return run();
  });
  try {
    await result;
  } finally {
    dispose();
  }
}

export default async function runSchemaFormSpec() {
  await withRoot(() => {
    const form = createForm(z.object({ reason: z.string().min(3, "Give a short reason") }), {
      initialValues: { reason: "" },
    });
    form.field("reason").onBlur();
    flush();
    equal(
      form.field("reason").errorMessage(),
      "Give a short reason",
      "explicit validation messages survive humanisation",
    );
  });
  await withRoot(() => {
    const form = createForm(z.object({ name: z.string().min(1).describe("Name") }), {
      initialValues: { name: "" },
    });
    form.field("name").onBlur();
    flush();
    equal(
      form.field("name").errorMessage(),
      "Name is required",
      "default validation messages stay humanised",
    );
  });
  await withRoot(() => {
    const form = createForm(z.object({ prompt: z.string(), files: z.array(z.instanceof(File)) }), {
      initialValues: { prompt: "", files: [] },
    });
    equal(form.meta.files?.type, "object-array", "custom File schemas can be introspected");
  });
  await withRoot(async () => {
    const schema = z.object({ activityId: z.string(), startDate: z.string() });
    const submitSchema = schema.refine(
      (values) => !values.activityId || Boolean(values.startDate),
      { message: "Activity type and start date are required", path: ["startDate"] },
    );
    const form = createForm(schema, {
      initialValues: { activityId: "meeting", startDate: "" },
      submitSchema,
    });
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
    form.field("startDate").onInput("2026-10-07");
    flush();
    await form.submit(() => {
      submitted = true;
    })();
    flush();
    equal(submitted, true, "corrected cross-field values submit successfully");
  });
  await withRoot(async () => {
    const schema = z.object({ name: z.string() });
    const form = createForm(schema, {
      initialValues: { name: " adam " },
      submitSchema: z.object({ name: z.string().trim().toUpperCase() }),
    });
    let submittedName = "";
    await form.submit((values) => {
      submittedName = values.name;
    })();
    flush();
    equal(submittedName, "ADAM", "handlers receive the submit schema's parsed values");
  });
  await withRoot(async () => {
    const form = createForm(z.object({ name: z.string() }), {
      initialValues: { name: "old" },
    });
    // Inputs and submit are imperative events outside the form's owned setup.
    await Promise.resolve();
    form.field("name").onInput("new");
    let submittedName = "";
    await form.submit((values) => {
      submittedName = values.name;
    })();
    flush();
    equal(submittedName, "new", "same-turn field changes reach the submit handler");
    equal(form.field("name").value(), "new", "submit preserves pending field changes");
  });
  await withRoot(async () => {
    const form = createForm(z.object({ first: z.string().min(1), second: z.string().min(1) }), {
      initialValues: { first: "", second: "" },
    });
    await Promise.resolve();
    form.field("first").onBlur();
    form.field("second").onBlur();
    flush();
    form.field("first").onInput("one");
    form.field("second").onInput("two");
    flush();
    equal(form.field("first").value(), "one", "same-turn updates retain the first field");
    equal(form.field("second").value(), "two", "same-turn updates retain the second field");
    equal(form.isValid(), true, "both updated required fields are valid");
    equal(
      form.field("first").errorMessage(),
      undefined,
      "validation includes pending first values",
    );
    equal(
      form.field("second").errorMessage(),
      undefined,
      "validation includes pending second values",
    );
  });
  console.log("ok - schema-form: explicit messages, custom schemas and submit validation");
}
