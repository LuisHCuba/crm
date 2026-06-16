import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import bcrypt from "bcryptjs";
import { Lock, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../lib/graphql";
import { LOGIN_QUERY } from "../lib/queries";
import { useAuth } from "../store/auth";

interface LoginResult {
  users: Array<{
    id: string;
    name: string;
    email: string;
    password_hash: string;
    role: string;
    avatar_url: string | null;
  }>;
}

export default function Login() {
  const navigate = useNavigate();
  const setUser = useAuth((s) => s.setUser);
  const [email, setEmail] = useState("adm@lhcx.tech");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await gqlClient.request<LoginResult>(LOGIN_QUERY, {
        email: email.trim().toLowerCase(),
      });
      const user = data.users[0];
      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        setError("Credenciais inválidas");
        return;
      }
      setUser({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
      });
      toast.success(`Bem-vindo, ${user.name}!`);
      navigate("/", { replace: true });
    } catch (err) {
      console.error(err);
      setError("Erro ao conectar com o servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src="/omnia.png"
            alt="Omn.ia"
            className="mx-auto mb-4 h-16 w-16 rounded-2xl object-cover shadow-lg shadow-indigo-500/30"
          />
          <h1 className="flex items-baseline justify-center gap-1.5 text-2xl font-bold text-white">
            Omn.ia
            <span className="text-sm font-medium text-slate-400">by LHCX</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Entre para acessar o painel
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              E-mail
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-white/10 bg-slate-900/50 py-2.5 pl-10 pr-3 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                placeholder="voce@empresa.com"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Senha
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-white/10 bg-slate-900/50 py-2.5 pl-10 pr-3 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 py-2.5 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-600 hover:to-violet-700 disabled:opacity-60"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
