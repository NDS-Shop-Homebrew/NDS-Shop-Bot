import { Moon, Sun } from "lucide-react";
import { useUI } from "../context/UIContext";
import { Button } from "./ui/button";

export function DarkModeToggle() {
  const { dark, toggleDark } = useUI();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleDark}
      className="text-muted-foreground"
      aria-label="Toggle Dark Mode"
      title="Toggle Dark Mode"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  );
}