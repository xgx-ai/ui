import { expect, test } from "bun:test";
import { QueryClient, query, queryGroup } from "../src/index.tsx";

/**
 * What a search box costs the cache, and what bounds it.
 *
 * The plan keeps every request-affecting value in the key, which means a free-text filter
 * mints an entry per distinct search term. That is the correct trade — dropping the term
 * from the key would make two different questions share an answer — but it has to be
 * bounded deliberately rather than by accident. These tests measure the cost and pin the
 * three things that bound it: cancellation, garbage collection, and debouncing at the
 * call site.
 */

function searchGroup() {
  const started: string[] = [];
  const settled: string[] = [];
  const release = new Map<string, () => void>();

  const group = queryGroup("records", {
    search: query({
      key: (term: string) => ({ term: term.trim() || undefined }),
      fetch: (key, context) => {
        const term = String(key.term ?? "");
        started.push(term);
        return new Promise<string>((resolveSearch, reject) => {
          release.set(term, () => {
            settled.push(term);
            resolveSearch(`results:${term}`);
          });
          context.signal.addEventListener("abort", () => reject(context.signal.reason), {
            once: true,
          });
        });
      },
      gcTime: 0,
    }),
  });

  return { group, release, settled, started };
}

/** Types a term one character at a time, the way an un-debounced input would. */
function keystrokes(term: string): string[] {
  return Array.from({ length: term.length }, (_, index) => term.slice(0, index + 1));
}

test("an un-debounced search mints one entry and one request per keystroke", async () => {
  const client = new QueryClient();
  const { group, started } = searchGroup();

  const requests = keystrokes("north").map((term) =>
    client.prefetch(group.search(term)).catch(() => undefined),
  );
  await Promise.resolve();

  // Five keystrokes, five distinct questions. This is the cost of keeping the term in the
  // key, and it is why the call site debounces rather than the key dropping the term.
  expect(started).toEqual(["n", "no", "nor", "nort", "north"]);
  expect(requests).toHaveLength(5);

  client.cancel(group.search.all);
  await Promise.all(requests);
});

test("debouncing at the call site collapses that to one entry", async () => {
  const client = new QueryClient();
  const { group, started } = searchGroup();

  // Only the settled term is ever asked for. Nothing about the key changes — the caller
  // simply stops asking questions it does not want the answer to.
  const request = client.prefetch(group.search("north")).catch(() => undefined);
  await Promise.resolve();

  expect(started).toEqual(["north"]);

  client.cancel(group.search.all);
  await request;
});

test("cancel aborts every superseded request in the family", async () => {
  const client = new QueryClient();
  const { group, release, settled, started } = searchGroup();

  const superseded = keystrokes("nort").map((term) =>
    client.prefetch(group.search(term)).catch(() => "aborted"),
  );
  await Promise.resolve();
  expect(started).toHaveLength(4);

  // The user stopped typing: abandon everything in flight, then ask the real question.
  client.cancel(group.search.all);
  const current = client.prefetch(group.search("north"));
  await Promise.resolve();

  expect(await Promise.all(superseded)).toEqual(["aborted", "aborted", "aborted", "aborted"]);
  expect(settled).toEqual([]);

  release.get("north")?.();
  expect(await current).toBe("results:north");
});

test("cancelling does not evict what has already settled", async () => {
  const client = new QueryClient();
  const { group, release } = searchGroup();

  const settledRequest = client.prefetch(group.search("north"));
  await Promise.resolve();
  release.get("north")?.();
  await settledRequest;

  client.cancel(group.search.all);

  expect(client.read(group.search("north"))).toBe("results:north");
});

test("unobserved entries are garbage collected, so the cache does not grow without bound", async () => {
  const client = new QueryClient();
  const { group, release } = searchGroup();

  for (const term of keystrokes("north")) {
    const request = client.prefetch(group.search(term));
    await Promise.resolve();
    release.get(term)?.();
    await request;
  }

  expect(client.read(group.search("north"))).toBe("results:north");

  // Nothing observes these entries, and `gcTime` is 0, so they go on the next task.
  await new Promise((settle) => setTimeout(settle, 0));

  for (const term of keystrokes("north")) {
    expect(client.read(group.search(term))).toBeUndefined();
  }
});

test("whitespace-only terms collapse onto the empty question", async () => {
  const client = new QueryClient();
  const { group, release, started } = searchGroup();

  const first = client.prefetch(group.search("  "));
  await Promise.resolve();
  release.get("")?.();
  await first;

  // Already answered: the normaliser mapped both to the same key.
  await client.prefetch(group.search(""));

  expect(started).toEqual([""]);
});
