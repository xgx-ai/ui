import { renderToString } from "@solidjs/web";
import { FieldLabel } from "../src/forms/form-components/field-label";
import { TextAreaForm } from "../src/forms/form-components/text-area-form";
import { TextFieldForm } from "../src/forms/form-components/text-field-form";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertAssociation(markup: string, control: "input" | "textarea", id?: string) {
  const label = markup.match(/<label\b([^>]*)>/);
  const input = markup.match(new RegExp(`<${control}\\b([^>]*)>`));
  assert(label, `${control} form field must render a semantic label`);
  assert(input, `${control} form field must render its control`);
  const labelId = label[1]?.match(/\bfor="([^"]+)"/)?.[1];
  const controlId = input[1]?.match(/\bid="([^"]+)"/)?.[1];
  assert(labelId, `${control} label must reference a non-empty control ID`);
  assert(labelId === controlId, `${control} label must reference the rendered control ID`);
  if (id) assert(controlId === id, `${control} form field must preserve its custom ID`);
  assert(
    [
      "font-medium",
      "peer-disabled:cursor-not-allowed",
      "peer-disabled:opacity-70",
      "data-invalid:text-error-foreground",
      "text-xs",
    ].every((className) => label[1]?.includes(className)),
    "Associating a label must preserve its existing classes",
  );
  return controlId;
}

export default function runFormLabelSsrSpec() {
  const standalone = renderToString(() => (
    <FieldLabel class="own-label-class" required>
      Generic field
    </FieldLabel>
  ));
  assert(standalone.startsWith("<div"), "A label without a control ID must retain its div wrapper");
  assert(!standalone.includes(" for="), "A standalone field label must not imply an association");
  assert(standalone.includes("own-label-class"), "Custom label classes must stay intact");
  assert(
    standalone.includes('class="text-error-foreground">*</span>'),
    "Required markers must stay intact",
  );

  const customInput = renderToString(() => (
    <TextFieldForm
      id="profile-name"
      label="Full name"
      placeholder="Enter your full name"
      value="Synthetic User"
      required
    />
  ));
  assertAssociation(customInput, "input", "profile-name");
  assert(
    customInput.includes("Full name"),
    "The associated label must retain the visible field name",
  );
  assert(
    customInput.includes('placeholder="Enter your full name"'),
    "Associating a label must not replace a distinct placeholder",
  );
  assert(
    !customInput.includes("aria-hidden"),
    "Required information must not be hidden without a corresponding required control state",
  );
  const defaultInput = renderToString(() => <TextFieldForm label="Email address" />);
  const generatedInputId = assertAssociation(defaultInput, "input");
  assert(generatedInputId !== "profile-name", "Generated IDs must not reuse a caller's custom ID");

  const customArea = renderToString(() => (
    <TextAreaForm id="review-notes" label="Review notes" placeholder="Write your notes" />
  ));
  assertAssociation(customArea, "textarea", "review-notes");
  const defaultArea = renderToString(() => <TextAreaForm label="Description" />);
  assertAssociation(defaultArea, "textarea");

  const multipleInputs = renderToString(() => (
    <>
      <TextFieldForm label="First field" />
      <TextFieldForm label="Second field" />
    </>
  ));
  const labelIds = [...multipleInputs.matchAll(/<label\b[^>]*\bfor="([^"]+)"/g)].map(
    (match) => match[1],
  );
  const inputIds = [...multipleInputs.matchAll(/<input\b[^>]*\bid="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert(labelIds.length === 2, "Each generated field must have its own label");
  assert(new Set(labelIds).size === 2, "Generated field IDs must be distinct within one render");
  assert(
    labelIds.every((id, index) => id === inputIds[index]),
    "Every generated label must associate with its own input",
  );
  console.log("ok - native form labels: custom and generated text input/textarea associations");
}
