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
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0A0A0E]">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-8 font-display text-3xl font-bold">
          <span className="text-[#FF4500]">✦</span> Grimório
        </Link>
        <form onSubmit={onSubmit} className="border border-white/10 p-8 rounded-sm bg-[#12121A]" data-testid="login-form">
          <h1 className="font-display text-3xl font-bold mb-1">Entrar</h1>
          <p className="text-sm text-gray-400 mb-6">Bem-vindo de volta, aventureiro.</p>

          <label className="block text-xs text-gray-400 font-mono mb-1">EMAIL</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            data-testid="login-email-input"
            className="w-full bg-[#0A0A0E] border border-white/10 rounded-sm px-3 py-2.5 mb-4 focus:outline-none focus:border-[#FF4500]"
          />

          <label className="block text-xs text-gray-400 font-mono mb-1">SENHA</label>
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            data-testid="login-password-input"
            className="w-full bg-[#0A0A0E] border border-white/10 rounded-sm px-3 py-2.5 mb-4 focus:outline-none focus:border-[#FF4500]"
          />

          {error && <div className="text-red-400 text-sm mb-4" data-testid="login-error">{error}</div>}

          <button
            type="submit" disabled={loading}
            data-testid="login-submit-btn"
            className="w-full bg-[#FF4500] hover:bg-[#FF6347] disabled:opacity-50 text-black font-medium py-2.5 rounded-sm"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div className="text-center text-sm text-gray-400 mt-6">
            Ainda não tem conta? <Link to="/register" className="text-[#FF4500] hover:underline" data-testid="goto-register-link">Criar conta</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
