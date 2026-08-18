import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto flex flex-col items-center justify-center text-center min-h-[60vh] space-y-4">
      <h1 className="text-6xl font-extrabold text-primary">404</h1>
      <p className="text-muted-foreground text-sm">Page introuvable.</p>
      <Button onClick={() => navigate("/overview")}>Retour à l'accueil</Button>
    </div>
  );
}