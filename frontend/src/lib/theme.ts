import { useEffect } from "react";

export type Theme = "dark" | "light";

export function getInitialTheme(): Theme {
  return "dark";
}

export function applyTheme(_theme?: Theme): void {
  const root = document.documentElement;
  root.classList.add("dark");
  root.classList.remove("light");
  if (document.body) {
    document.body.classList.add("dark");
    document.body.classList.remove("light");
  }
  root.style.colorScheme = "dark";
  try {
    localStorage.setItem("interviewiq_theme", "dark");
  } catch {}
}

export function useTheme() {
  useEffect(() => {
    applyTheme("dark");
  }, []);

  return { theme: "dark" as Theme };
}
