import { tags as t } from "@lezer/highlight";
import { createTheme } from "@uiw/codemirror-themes";

// Matches Strop's "Smooth Tech" palette used across the rest of the
// app (Landing.tsx, Badge variants, etc.) rather than a generic editor theme.
// createTheme() mounts a new set of CSS rules every time it is called, and the old ones are never removed. Building a theme
// per theme toggle therefore made the stylesheet grow with every switch, so each distinct (size, light/dark) pair is built once.
const themeCache = new Map<string, ReturnType<typeof createTheme>>();

export function buildEditorTheme(fontSize: number, isLight = false) {
  const key = `${fontSize}:${isLight ? "light" : "dark"}`;
  let theme = themeCache.get(key);
  if (!theme) {
    theme = createEditorTheme(fontSize, isLight);
    themeCache.set(key, theme);
  }
  return theme;
}

function createEditorTheme(fontSize: number, isLight: boolean) {
  if (isLight) {
    return createTheme({
      theme: "light",
      settings: {
        background: "transparent",
        foreground: "#28251c",
        caret: "#2a261b",
        selection: "rgba(42, 38, 27, 0.16)",
        selectionMatch: "rgba(42, 38, 27, 0.1)",
        lineHighlight: "rgba(42, 38, 27, 0.05)",
        gutterBackground: "transparent",
        gutterForeground: "#a59d80",
        gutterActiveForeground: "#5a5646",
        gutterBorder: "transparent",
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: `${fontSize}px`,
      },
      styles: [
        { tag: t.comment, color: "#8c8570", fontStyle: "italic" },
        { tag: t.lineComment, color: "#8c8570", fontStyle: "italic" },
        { tag: t.blockComment, color: "#8c8570", fontStyle: "italic" },

        { tag: t.keyword, color: "#8a4b12", fontWeight: "600" },
        { tag: t.controlKeyword, color: "#8a4b12", fontWeight: "600" },
        { tag: t.moduleKeyword, color: "#8a4b12" },
        { tag: t.operatorKeyword, color: "#8a4b12" },
        { tag: t.definitionKeyword, color: "#8a4b12" },

        { tag: t.string, color: "#2a7a56" },
        { tag: t.special(t.string), color: "#2a7a56" },
        { tag: t.regexp, color: "#2a7a56" },

        { tag: t.number, color: "#9a6508" },
        { tag: t.bool, color: "#9a6508" },
        { tag: t.null, color: "#9a6508" },
        { tag: t.atom, color: "#9a6508" },

        { tag: t.function(t.variableName), color: "#3b3322" },
        { tag: t.function(t.propertyName), color: "#3b3322" },
        { tag: t.definition(t.function(t.variableName)), color: "#3b3322", fontWeight: "600" },
        { tag: t.className, color: "#3b3322", fontWeight: "600" },
        { tag: t.typeName, color: "#3b3322" },

        { tag: t.variableName, color: "#28251c" },
        { tag: t.propertyName, color: "#4a4637" },
        { tag: t.definition(t.variableName), color: "#28251c" },

        { tag: t.operator, color: "#6c6753" },
        { tag: t.punctuation, color: "#6c6753" },
        { tag: t.bracket, color: "#6c6753" },
        { tag: t.derefOperator, color: "#6c6753" },

        { tag: t.meta, color: "#bd3550" },
        { tag: t.annotation, color: "#bd3550" },
        { tag: t.invalid, color: "#bd3550" },
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
