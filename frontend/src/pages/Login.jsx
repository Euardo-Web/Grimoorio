import GoogleSignIn from "@/components/GoogleSignIn";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate, Navigate } from "react-router-dom";

export default function Login() {
  const { user, login, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  if (user) return <Navigate to="/app" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) nav("/app");
  };

  return (
    <div className="auth-shell min-h-screen flex items-center justify-center px-4 py-12 bg-[#101416]">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-8 font-display text-3xl font-bold">
          <span className="text-[#D5AB68]">🖋</span> Grimoorio
        </Link>
        <form onSubmit={onSubmit} className="border border-white/10 p-8 rounded-sm bg-[#191F22]" data-testid="login-form">
          <h1 className="font-display text-3xl font-bold mb-1">Entrar</h1>
          <p className="text-sm text-gray-400 mb-6">Bem-vindo de volta, aventureiro.</p>

          <GoogleSignIn />
          {new URLSearchParams(window.location.search).get("oauth_error") && <p role="alert" className="auth-error">{new URLSearchParams(window.location.search).get("oauth_error")}</p>}
          <label htmlFor="login-email" className="block text-xs text-gray-400 font-mono mb-1">EMAIL</label>
          <input id="login-email"
            type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            data-testid="login-email-input"
            className="w-full bg-[#101416] border border-white/10 rounded-sm px-3 py-2.5 mb-4 focus:outline-none focus:border-[#D5AB68]"
          />

          <label htmlFor="login-senha" className="block text-xs text-gray-400 font-mono mb-1">SENHA</label>
          <input id="login-senha"
            type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}
            data-testid="login-password-input"
            className="w-full bg-[#101416] border border-white/10 rounded-sm px-3 py-2.5 mb-4 focus:outline-none focus:border-[#D5AB68]"
          />

          {error && <div role="alert" className="text-red-400 text-sm mb-4" data-testid="login-error">{error}</div>}

          <button
            type="submit" disabled={loading}
            data-testid="login-submit-btn"
            className="w-full bg-[#D5AB68] hover:bg-[#E5C38D] disabled:opacity-50 text-black font-medium py-2.5 rounded-sm"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div className="text-center text-sm text-gray-400 mt-6">
            Ainda não tem conta? <Link to="/register" className="text-[#D5AB68] hover:underline" data-testid="goto-register-link">Criar conta</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
