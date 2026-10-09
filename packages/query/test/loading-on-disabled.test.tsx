import { expect, test } from "bun:test";
import { createMemo, createRoot, createSignal, flatten, flush, Loading } from "solid-js";
import { createQuery, QueryClient, query, queryGroup } from "../src/index.tsx";

/**
 * S18 in docs/solid-2-beta-issues.md: a `<Loading on>` boundary re-armed by the change that
 * disables a query stayed on its fallback for good, although its content had stopped reading
 * that query. Auno's Compliance & Work report did this when its Type filter switched the
 * statutory query off.
 */

async function settle() {
  for (let turn = 0; turn < 10; turn++) {
    flush();
    await new Promise<void>((resolveTurn) => setTimeout(resolveTurn, 0));
  }
  flush();
}

type Report = "statutory" | "work";

function reportQueries(calls: string[]) {
  const answer = (report: Report) => async (key: { type: string }) => {
    calls.push(`${report}:${key.type}`);
    return [`${report}-${key.type}`];
  };
  return queryGroup("loading-on-disabled", {
    statutory: query({ key: (type: string) => ({ type }), fetch: answer("statutory") }),
    work: query({ key: (type: string) => ({ type }), fetch: answer("work") }),
  });
}

test("a Loading on boundary reveals content that stopped reading a query the change disabled", async () => {
  const calls: string[] = [];
  const reports = reportQueries(calls);
  const client = new QueryClient();
  let dispose = () => {};
  const run = createRoot((disposeRoot) => {
    dispose = disposeRoot;
    const [type, setType] = createSignal<"all" | "service">("all");

    function Rows(props: { type: "all" | "service" }) {
      const statutoryDescriptor = createMemo(() =>
        props.type === "service" ? null : reports.statutory(props.type),
      );
      const statutory = createQuery(statutoryDescriptor, client);
      const work = createQuery(() => reports.work(props.type), client);
      // The guard drops the statutory read in the same update that disables it.
      const rows = createMemo(() => [
        ...(statutoryDescriptor() ? statutory.data() : []),
        ...work.data(),
      ]);
      return <>{rows().join(",")}</>;
    }

    const tree = (
      <Loading on={type()} fallback="loading">
        <Rows type={type()} />
      </Loading>
    );
    return { rendered: createMemo(() => flatten(tree)), setType };
  });

  try {
    run.rendered();
    await settle();
    expect(run.rendered()).toBe("statutory-all,work-all");

    run.setType("service");
    await settle();
    expect(calls).toEqual(["statutory:all", "work:all", "work:service"]);
    expect(run.rendered()).toBe("work-service");

    run.setType("all");
    await settle();
    expect(run.rendered()).toBe("statutory-all,work-all");
  } finally {
    dispose();
  }
});

test("a disabled query stays not ready for a reader that keeps reading it", async () => {
  const calls: string[] = [];
  const reports = reportQueries(calls);
  const client = new QueryClient();
  let dispose = () => {};
  const run = createRoot((disposeRoot) => {
    dispose = disposeRoot;
    const [type, setType] = createSignal<string | null>("all");

    function Rows() {
      const statutory = createQuery(() => {
        const current = type();
        return current ? reports.statutory(current) : null;
      }, client);
      return <>{statutory.data().join(",")}</>;
    }

    const tree = (
      <Loading on={type()} fallback="loading">
        <Rows />
      </Loading>
    );
    return { rendered: createMemo(() => flatten(tree)), setType };
  });

  try {
    run.rendered();
    await settle();
    expect(run.rendered()).toBe("statutory-all");

    // No question to ask: the read suspends, and the boundary shows its fallback.
    run.setType(null);
    await settle();
    expect(run.rendered()).toBe("loading");

    // Asked again, the boundary lets go of the disabled read it collected.
    run.setType("annual");
    await settle();
    expect(calls).toEqual(["statutory:all", "statutory:annual"]);
    expect(run.rendered()).toBe("statutory-annual");
  } finally {
    dispose();
  }
});

test("disposing a disabled query that lost its reader is quiet", async () => {
  const client = new QueryClient();
  const reports = reportQueries([]);
  const errors: unknown[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => errors.push(args);
  try {
    let dispose = () => {};
    const run = createRoot((disposeRoot) => {
      dispose = disposeRoot;
      const [enabled, setEnabled] = createSignal(true);
      const statutory = createQuery(() => (enabled() ? reports.statutory("all") : null), client);
      const rows = createMemo(() => (enabled() ? statutory.data() : []));
      return { rows, setEnabled };
    });
    await settle();
    expect(run.rows()).toEqual(["statutory-all"]);
    run.setEnabled(false);
    await settle();
    expect(run.rows()).toEqual([]);
    dispose();
    await settle();
    expect(errors).toEqual([]);
  } finally {
    console.error = originalError;
  }
});
