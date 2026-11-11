import type { DocEdit, Replacement } from "./types";

export function applyReplacements(
  base: string,
  replacements: Replacement[],
): string {
  let result = base;

  for (const replacement of replacements) {
    if (!replacement.find) {
      throw new Error("Replacement anchor is empty.");
    }

    const first = result.indexOf(replacement.find);
    if (first === -1) {
      throw new Error(
        `Replacement anchor not found: ${replacement.find.slice(0, 80)}`,
      );
    }

    const last = result.lastIndexOf(replacement.find);
    if (first !== last) {
      throw new Error(
        `Replacement anchor is ambiguous (${replacement.find.slice(0, 80)}). The model must include more surrounding context.`,
      );
    }

    result =
      result.slice(0, first) +
      replacement.replace +
      result.slice(first + replacement.find.length);
  }

  return result;
}

export function applyDocEdit(base: string, edit: DocEdit): string {
  if (typeof edit.content === "string") {
    return edit.content;
  }

  if (edit.replacements && edit.replacements.length > 0) {
    return applyReplacements(base, edit.replacements);
  }

  throw new Error(`Edit for ${edit.path} contains neither content nor replacements.`);
}
