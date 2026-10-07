import { createRoot, flush } from "solid-js";
import { Popover, PopoverTrigger } from "../src/overlays/popover";

export default function runPopoverContextSpec() {
  let dispose = () => {};
  try {
    createRoot((cleanup) => {
      dispose = cleanup;
      // The constructor must accept a root with no parent. Do not realise its
      // DOM: context lookup happens before the lazy rendered tree is returned.
      Popover({ children: null });
    });
    flush();
  } finally {
    dispose();
  }

  let error: unknown;
  createRoot((cleanup) => {
    try {
      PopoverTrigger({});
    } catch (cause) {
      error = cause;
    } finally {
      cleanup();
    }
  });
  if (!(error instanceof Error) || error.message !== "Popover parts must be used inside Popover.") {
    throw new Error("Orphan popover parts must report the library's missing-parent error.");
  }
  console.log("ok - popover: root constructor and orphan part context");
}

if (import.meta.main) runPopoverContextSpec();
