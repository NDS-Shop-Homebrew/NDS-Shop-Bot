import { Moon, Sun } from "lucide-react";
import { useUI } from "../context/UIContext";

export function DarkModeToggle() {
  const { dark, toggleDark } = useUI();
  return (
    <button
      onClick={toggleDark}
      className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
      aria-label="Toggle Dark Mode"
      title="Toggle Dark Mode"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}