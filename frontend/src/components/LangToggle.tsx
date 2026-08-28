import { Languages } from "lucide-react";
import { useUI } from "../context/UIContext";
import { Button } from "./ui/button";

export function LangToggle() {
  const { lang, setLang } = useUI();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLang(lang === "fr" ? "en" : "fr")}
      className="text-muted-foreground"
      title="Toggle language"
    >
      <span className="flex items-center gap-1.5">
        <Languages size={14} />
        {lang === "fr" ? "EN" : "FR"}
      </span>
    </Button>
  );
}