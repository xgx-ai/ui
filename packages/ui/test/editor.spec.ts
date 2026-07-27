import { ParameterNode } from "../src/editor/extensions/parameter-node.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

export default function runEditorSpec() {
  const renderHTML = ParameterNode.config.renderHTML as
    | ((input: {
        HTMLAttributes: Record<string, unknown>;
        node: { attrs: Record<string, unknown> };
      }) => unknown[])
    | undefined;
  assert(renderHTML, "Parameter node does not define an HTML renderer");

  const output = renderHTML({
    HTMLAttributes: { "data-param-name": "doc.title" },
    node: { attrs: { paramName: "doc.title" } },
  });

  assertEqual(output[0], "span", "Parameter node did not render a span");
  assertEqual(output[2], "{{doc.title}}", "Parameter node did not render its token text");
  assert(!output.includes(0), "Leaf parameter node rendered an invalid content hole");

  const renderText = ParameterNode.config.renderText;
  assert(renderText, "Parameter node does not define a text renderer");
  assertEqual(
    renderText.call(undefined as never, {
      node: { attrs: { paramName: "doc.title" } },
    } as never),
    "{{doc.title}}",
    "Parameter text renderer did not preserve the merge-tag token",
  );
  assertEqual(
    ParameterNode.configure({ mode: "token" }).options.mode,
    "token",
    "Parameter node did not retain token mode",
  );
}
