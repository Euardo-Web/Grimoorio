import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate, Navigate } from "react-router-dom";

export default function Register() {
  const { user, register, error } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "player" });
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  if (user) return <Navigate to="/app" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ok = await register(form);
    setLoading(false);
    if (ok) nav("/app");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0A0A0E]">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-8 font-display text-3xl font-bold">
          <span className="text-[#FF4500]">✦</span> Grimório
        </Link>
        <form onSubmit={onSubmit} className="border border-white/10 p-8 rounded-sm bg-[#12121A]" data-testid="register-form">
          <h1 className="font-display text-3xl font-bold mb-1">Criar conta</h1>
          <p className="text-sm text-gray-400 mb-6">Comece sua jornada.</p>

          <label className="block text-xs text-gray-400 font-mono mb-1">NOME</label>
          <input
            required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            data-testid="register-name-input"
            className="w-full bg-[#0A0A0E] border border-white/10 rounded-sm px-3 py-2.5 mb-4 focus:outline-none focus:border-[#FF4500]"
          />

          <label className="block text-xs text-gray-400 font-mono mb-1">EMAIL</label>
          <input
            type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            data-testid="register-email-input"
            className="w-full bg-[#0A0A0E] border border-white/10 rounded-sm px-3 py-2.5 mb-4 focus:outline-none focus:border-[#FF4500]"
          />

          <label className="block text-xs text-gray-400 font-mono mb-1">SENHA</label>
          <input
            type="password" required minLength={6} value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            data-testid="register-password-input"
            className="w-full bg-[#0A0A0E] border border-white/10 rounded-sm px-3 py-2.5 mb-4 focus:outline-none focus:border-[#FF4500]"
          />

          <label className="block text-xs text-gray-400 font-mono mb-1">PAPEL</label>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {[["player", "Jogador"], ["master", "Mestre"]].map(([v, lbl]) => (
              <button
                type="button" key={v}
                onClick={() => setForm({ ...form, role: v })}
                data-testid={`role-${v}-btn`}
                className={`py-2 rounded-sm border ${form.role === v ? "border-[#FF4500] bg-[#FF4500]/10 text-white" : "border-white/10 text-gray-400 hover:border-white/30"}`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {error && <div className="text-red-400 text-sm mb-4" data-testid="register-error">{error}</div>}

          <button
            type="submit" disabled={loading}
            data-testid="register-submit-btn"
            className="w-full bg-[#FF4500] hover:bg-[#FF6347] disabled:opacity-50 text-black font-medium py-2.5 rounded-sm"
          >
            {loading ? "Criando..." : "Criar conta"}
          </button>

          <div className="text-center text-sm text-gray-400 mt-6">
            Já tem conta? <Link to="/login" className="text-[#FF4500] hover:underline" data-testid="goto-login-link">Entrar</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
