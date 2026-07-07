/**
 * Module-level reactive store for parameter values.
 * Used by the ParameterNode NodeViews (vanilla DOM) to look up current values
 * and re-render when they change.
 */

type Listener = () => void;
export type EditorParameter = {
  id: string;
  name: string;
  value: string;
  position: number;
};
export type ParameterValueUpdater = (parameter: EditorParameter, nextValue: string) => void;

const parameters = new Map<string, EditorParameter>();
const ambiguousParameterNames = new Set<string>();
const listeners = new Set<Listener>();
let parameterValueUpdater: ParameterValueUpdater | null = null;

function normaliseParameterName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function syncParameters(params: EditorParameter[]): void {
  parameters.clear();
  ambiguousParameterNames.clear();

  for (const parameter of params) {
    const key = normaliseParameterName(parameter.name);
    if (!key) continue;

    if (ambiguousParameterNames.has(key)) {
      continue;
    }

    if (parameters.has(key)) {
      parameters.delete(key);
      ambiguousParameterNames.add(key);
      continue;
    }

    parameters.set(key, {
      id: parameter.id,
      name: parameter.name,
      value: parameter.value,
      position: parameter.position,
    });
  }

  emitChange();
}

export function clearParameters(): void {
  syncParameters([]);
}

export function setParameterValueUpdater(updater: ParameterValueUpdater | null): void {
  parameterValueUpdater = updater;
}

export function getParameter(name: string): EditorParameter | undefined {
  return parameters.get(normaliseParameterName(name));
}

export function getParameterValue(name: string): string | undefined {
  return getParameter(name)?.value;
}

export function isParameterAmbiguous(name: string): boolean {
  return ambiguousParameterNames.has(normaliseParameterName(name));
}

export function updateParameterValue(name: string, nextValue: string): boolean {
  const parameter = getParameter(name);
  if (!parameter || !parameterValueUpdater) {
    return false;
  }

  parameterValueUpdater(parameter, nextValue);
  return true;
}

export function onParameterValuesChange(callback: Listener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
