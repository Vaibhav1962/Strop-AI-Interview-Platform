import { tags as t } from "@lezer/highlight";
import { createTheme } from "@uiw/codemirror-themes";

// Matches Strop's "Smooth Tech" palette used across the rest of the
// app (Landing.tsx, Badge variants, etc.) rather than a generic editor theme.
export function buildEditorTheme(fontSize: number, isLight = false) {
  if (isLight) {
    return createTheme({
      theme: "light",
      settings: {
        background: "transparent",
        foreground: "#1e2029",
        caret: "#d6cdb6",
        selection: "rgba(230, 223, 204,0.18)",
        selectionMatch: "rgba(230, 223, 204,0.12)",
        lineHighlight: "rgba(0,0,0,0.03)",
        gutterBackground: "transparent",
        gutterForeground: "#888b9a",
        gutterActiveForeground: "#16171d",
        gutterBorder: "transparent",
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: `${fontSize}px`,
      },
      styles: [
        { tag: t.comment, color: "#7c8091", fontStyle: "italic" },
        { tag: t.lineComment, color: "#7c8091", fontStyle: "italic" },
        { tag: t.blockComment, color: "#7c8091", fontStyle: "italic" },
        { tag: t.keyword, color: "#d6cdb6", fontWeight: "600" },
        { tag: t.controlKeyword, color: "#d6cdb6", fontWeight: "600" },
        { tag: t.moduleKeyword, color: "#d6cdb6" },
        { tag: t.operatorKeyword, color: "#d6cdb6" },
        { tag: t.definitionKeyword, color: "#d6cdb6" },
        { tag: t.string, color: "#059669" },
        { tag: t.special(t.string), color: "#059669" },
        { tag: t.regexp, color: "#059669" },
        { tag: t.number, color: "#e8bd6f" },
        { tag: t.bool, color: "#e8bd6f" },
        { tag: t.null, color: "#e8bd6f" },
        { tag: t.atom, color: "#e8bd6f" },
        { tag: t.function(t.variableName), color: "#d6cdb6" },
        { tag: t.function(t.propertyName), color: "#d6cdb6" },
        { tag: t.definition(t.function(t.variableName)), color: "#d6cdb6", fontWeight: "600" },
        { tag: t.className, color: "#0891b2" },
        { tag: t.typeName, color: "#0891b2" },
        { tag: t.variableName, color: "#16171d" },
        { tag: t.propertyName, color: "#374151" },
        { tag: t.definition(t.variableName), color: "#16171d" },
        { tag: t.operator, color: "#4b5563" },
        { tag: t.punctuation, color: "#8f8d85" },
        { tag: t.bracket, color: "#8f8d85" },
        { tag: t.derefOperator, color: "#4b5563" },
        { tag: t.meta, color: "#e11d48" },
        { tag: t.annotation, color: "#e11d48" },
        { tag: t.invalid, color: "#e11d48" },
      ],
    });
  }

  return createTheme({
    theme: "dark",
    settings: {
      background: "transparent",
      foreground: "#ebe9e2",
      caret: "#e6dfcc",
      selection: "rgba(230, 223, 204,0.25)",
      selectionMatch: "rgba(230, 223, 204,0.18)",
      lineHighlight: "rgba(230,223,204,0.05)",
      gutterBackground: "transparent",
      gutterForeground: "#5f5e58",
      gutterActiveForeground: "#8f8d85",
      gutterBorder: "transparent",
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: `${fontSize}px`,
    },
    styles: [
      { tag: t.comment, color: "#8f8d85", fontStyle: "italic" },
      { tag: t.lineComment, color: "#8f8d85", fontStyle: "italic" },
      { tag: t.blockComment, color: "#8f8d85", fontStyle: "italic" },

      { tag: t.keyword, color: "#e6dfcc" },
      { tag: t.controlKeyword, color: "#e6dfcc" },
      { tag: t.moduleKeyword, color: "#e6dfcc" },
      { tag: t.operatorKeyword, color: "#e6dfcc" },
      { tag: t.definitionKeyword, color: "#e6dfcc" },

      { tag: t.string, color: "#6fd6a4" },
      { tag: t.special(t.string), color: "#6fd6a4" },
      { tag: t.regexp, color: "#6fd6a4" },

      { tag: t.number, color: "#e8bd6f" },
      { tag: t.bool, color: "#e8bd6f" },
      { tag: t.null, color: "#e8bd6f" },
      { tag: t.atom, color: "#e8bd6f" },

      { tag: t.function(t.variableName), color: "#f3eddb" },
      { tag: t.function(t.propertyName), color: "#f3eddb" },
      { tag: t.definition(t.function(t.variableName)), color: "#f3eddb" },
      { tag: t.className, color: "#f3eddb" },
      { tag: t.typeName, color: "#f3eddb" },

      { tag: t.variableName, color: "#ebe9e2" },
      { tag: t.propertyName, color: "#d3d1c9" },
      { tag: t.definition(t.variableName), color: "#ebe9e2" },

      { tag: t.operator, color: "#8f8d85" },
      { tag: t.punctuation, color: "#8f8d85" },
      { tag: t.bracket, color: "#8f8d85" },
      { tag: t.derefOperator, color: "#8f8d85" },

      { tag: t.meta, color: "#f08a98" },
      { tag: t.annotation, color: "#f08a98" },
      { tag: t.invalid, color: "#f08a98" },
    ],
  });
}
