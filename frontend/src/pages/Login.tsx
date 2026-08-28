import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Spinner } from "../components/ui/spinner";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Card, CardContent, CardFooter } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { Checkbox } from "../components/ui/checkbox";
import { DarkModeToggle } from "../components/DarkModeToggle";
import { LangToggle } from "../components/LangToggle";
import { useUI } from "../context/UIContext";
import { Shield, Lock, Mail, User, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const { t } = useUI();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const result = await login(username, password);
      if (!result.ok) setError(t("login.error"));
    } catch {
      setError(t("login.serverError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8 relative">
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <DarkModeToggle />
        <LangToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Shield className="size-6 text-primary" />
          </div>
          <span className="text-xl font-bold text-foreground">NDS-Shop-Bot Admin Panel</span>
        </div>

        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-foreground">{t("login.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("login.subtitle")}</p>
        </div>

        <Card className="shadow-sm border-border">
          <CardContent className="space-y-4 p-6">
            {error && (
              <Alert variant="destructive" className="mb-2">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm font-medium text-foreground">
                  {t("login.username")}
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="username"
                    type="text"
                    placeholder={t("login.usernamePh")}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    autoComplete="username"
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  {t("login.password")}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("login.passwordPh")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="pl-10 pr-10 h-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-start">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={remember}
                    onCheckedChange={(checked: boolean) => setRemember(checked)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <span className="text-sm text-muted-foreground">{t("login.remember")}</span>
                </label>
              </div>

              <Separator className="my-2" />

              <Button
                type="submit"
                disabled={isLoading || !username || !password}
                className="w-full h-11 gap-2 font-semibold text-base"
              >
                {isLoading ? (
                  <>
                    <Spinner className="size-4" />
                    {t("login.loading")}
                  </>
                ) : (
                  <>
                    <Mail className="size-4" />
                    {t("login.submit")}
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col items-center gap-3 pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              {t("login.reserved")}
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}