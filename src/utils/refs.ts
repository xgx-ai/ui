export type Ref<T> = T | ((value: T) => void) | undefined;

export function mergeRefs<T>(...refs: Ref<T>[]) {
  return (value: T) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        (ref as unknown as (value: T) => void)(value);
      }
    }
  };
}
