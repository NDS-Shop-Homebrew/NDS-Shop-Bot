import { Languages } from "lucide-react";
import { useUI } from "../context/UIContext";

export function LangToggle() {
  const { lang, setLang } = useUI();
  return (
    <button
      onClick={() => setLang(lang === "fr" ? "en" : "fr")}
      className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors text-muted-foreground"
      title="Toggle language"
    >
      <span className="flex items-center gap-1.5">
        <Languages size={14} />
        {lang === "fr" ? "EN" : "FR"}
      </span>
    </button>
  );
}