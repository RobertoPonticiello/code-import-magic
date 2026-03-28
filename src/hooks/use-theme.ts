import { useState } from "react";

type Theme = "light" | "dark";

export const useTheme = (): [Theme, () => void] => {
  const [theme, setTheme] = useState<Theme>(
    (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light"
  );

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  };

  return [theme, toggleTheme];
}

export default useTheme;
