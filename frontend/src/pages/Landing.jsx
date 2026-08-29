import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { DiceSix, Shield, Sparkle, Users, Scroll, Sword } from "@phosphor-icons/react";
import { Navigate } from "react-router-dom";

export default function Landing() {
  const { user } = useAuth();
  if (user) return <Navigate to="/app" replace />;

  const FEATURES = [
    { icon: Shield, title: "Fichas Vivas", desc: "Atributos, perícias, HP, condições e histórico completo." },
    { icon: Sparkle, title: "Grimório", desc: "Espaços de magia por círculo, preparadas ou conhecidas." },
    { icon: Sword, title: "Combate Rápido", desc: "Iniciativa, HP temporário, condições e rolagens integradas." },
    { icon: DiceSix, title: "Dados Compartilhados", desc: "Toda a mesa vê as rolagens ao vivo." },
    { icon: Users, title: "Campanhas & Convites", desc: "Códigos de 6 dígitos para trazer o grupo." },
    { icon: Scroll, title: "Biblioteca Pública", desc: "Mestres compartilham modelos de sistema entre si." },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white relative overflow-hidden">
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
        <div className="font-display text-2xl font-bold">
          <span className="text-[#FF4500]">✦</span> Grimório
        </div>
        <div className="flex gap-3">
          <Link to="/login" data-testid="landing-login-btn" className="text-sm text-gray-300 hover:text-white px-4 py-2">Entrar</Link>
          <Link to="/register" data-testid="landing-signup-btn" className="text-sm bg-[#FF4500] hover:bg-[#FF6347] text-black font-medium px-4 py-2 rounded-sm">Criar conta</Link>
        </div>
      </nav>

      <section className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 pt-16 pb-20">
        <div className="grid md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/10 rounded-sm mb-6 text-xs font-mono text-gray-400">
              <span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full animate-pulse" />
              MESA VIRTUAL PARA D&D, TORMENTA E CUSTOMIZADO
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-none mb-6">
              Sua mesa de RPG,<br />
              <span className="text-[#FF4500]">forjada</span> em um só lugar.
            </h1>
            <p className="text-lg text-gray-400 max-w-xl mb-8 leading-relaxed">
              Crie campanhas, gerencie fichas, controle magias, role dados compartilhados com o grupo e nunca mais perca o fio da narrativa.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register" data-testid="hero-cta" className="bg-[#FF4500] hover:bg-[#FF6347] text-black font-medium px-6 py-3 rounded-sm inline-flex items-center gap-2">
                Começar agora <DiceSix weight="fill" size={18} />
              </Link>
              <Link to="/login" className="border border-white/10 hover:border-white/30 px-6 py-3 rounded-sm">Já tenho conta</Link>
            </div>
          </div>
          <div className="md:col-span-5 hidden md:block">
            <div className="glass p-6 rounded-sm">
              <div className="font-mono text-xs text-gray-500 mb-3">// ficha ativa</div>
              <div className="font-display text-2xl mb-1">Kaelith, a Sombra</div>
              <div className="text-sm text-gray-400 mb-6">Elfo Ranger — Nível 5</div>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[["FOR","14","+2"],["DES","18","+4"],["CON","13","+1"],["INT","10","0"],["SAB","16","+3"],["CAR","8","-1"]].map(([k,v,m]) => (
                  <div key={k} className="border border-white/10 p-2 text-center">
                    <div className="text-[10px] text-gray-500 font-mono">{k}</div>
                    <div className="font-mono text-xl font-bold">{v}</div>
                    <div className="text-xs text-[#FF4500] font-mono">{m}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/5 pt-4 flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-500 font-mono">HP</div>
                  <div className="font-mono text-2xl"><span className="text-[#FF4500]">38</span><span className="text-gray-500">/45</span></div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 font-mono">CA</div>
                  <div className="font-mono text-2xl">16</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 pb-24">
        <div className="grid md:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="border border-white/10 hover:border-[#FF4500]/50 p-6 rounded-sm">
              <Icon size={28} className="text-[#FF4500] mb-3" weight="duotone" />
              <div className="font-display text-xl font-semibold mb-2">{title}</div>
              <div className="text-sm text-gray-400 leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 text-center py-6 text-xs text-gray-500 font-mono">
        Feito para mestres exigentes e jogadores curiosos.
      </footer>
    </div>
  );
}
