import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Users, UserCircle, Books, DiceSix, Sparkle } from "@phosphor-icons/react";
import DiceRoller from "@/components/DiceRoller";

export default function Dashboard() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [characters, setCharacters] = useState([]);

  useEffect(() => {
    (async () => {
      const [c, ch] = await Promise.all([api.get("/campaigns"), api.get("/characters")]);
      setCampaigns(c.data); setCharacters(ch.data);
    })();
  }, []);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="text-xs text-gray-500 font-mono mb-1">// bem-vindo de volta</div>
          <h1 className="font-display text-4xl md:text-5xl font-bold">Olá, {user?.name}.</h1>
          <p className="text-gray-400 mt-2">O que vamos jogar hoje?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Campanhas", value: campaigns.length, icon: Users, to: "/app/campaigns" },
            { label: "Personagens", value: characters.length, icon: UserCircle, to: "/app/characters" },
            { label: "Modelos", value: "→", icon: Books, to: "/app/templates" },
            { label: "Papel", value: user?.role === "master" ? "Mestre" : "Jogador", icon: Sparkle, to: "/app" },
          ].map(({ label, value, icon: Icon, to }) => (
            <Link to={to} key={label} className="border border-white/10 p-5 bg-[#12121A] hover:border-[#FF4500]/50 rounded-sm">
              <Icon size={20} className="text-[#FF4500] mb-3" weight="duotone" />
              <div className="text-xs text-gray-500 font-mono uppercase">{label}</div>
              <div className="font-display text-3xl font-bold mt-1">{value}</div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-display text-2xl font-semibold">Suas Campanhas</h2>
                <Link to="/app/campaigns" className="text-sm text-[#FF4500] hover:underline" data-testid="see-campaigns-link">Ver todas →</Link>
              </div>
              {campaigns.length === 0 ? (
                <div className="border border-white/10 p-8 text-center rounded-sm text-gray-500">
                  Sem campanhas ainda. <Link to="/app/campaigns" className="text-[#FF4500] hover:underline">Criar ou entrar</Link>.
                </div>
              ) : (
                <div className="space-y-2">
                  {campaigns.slice(0, 4).map((c) => (
                    <Link key={c.id} to={`/app/campaigns/${c.id}`} data-testid={`campaign-card-${c.id}`}
                      className="flex items-center justify-between border border-white/10 p-4 rounded-sm hover:border-[#FF4500]/50">
                      <div>
                        <div className="font-display text-lg font-semibold">{c.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{c.system.toUpperCase()} • {c.is_master ? "Mestre" : "Jogador"}</div>
                      </div>
                      <div className="text-xs text-gray-500 font-mono">#{c.invite_code}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-display text-2xl font-semibold">Seus Personagens</h2>
                <Link to="/app/characters" className="text-sm text-[#FF4500] hover:underline" data-testid="see-characters-link">Ver todos →</Link>
              </div>
              {characters.length === 0 ? (
                <div className="border border-white/10 p-8 text-center rounded-sm text-gray-500">
                  Sem personagens ainda. <Link to="/app/characters" className="text-[#FF4500] hover:underline">Criar um</Link>.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {characters.slice(0, 4).map((c) => (
                    <Link key={c.id} to={`/app/characters/${c.id}`} data-testid={`char-card-${c.id}`}
                      className="border border-white/10 p-4 rounded-sm hover:border-[#FF4500]/50">
                      <div className="font-display text-lg font-semibold">{c.name}</div>
                      <div className="text-xs text-gray-500 font-mono mt-1">
                        {c.class_name || "—"} • Nv {c.level}
                      </div>
                      <div className="flex gap-3 mt-2 text-xs font-mono">
                        <span className="text-[#FF4500]">HP {c.hp_current}/{c.hp_max}</span>
                        <span className="text-gray-500">CA {c.armor_class}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="h-[500px]">
            <DiceRoller />
          </div>
        </div>
      </div>
    </Layout>
  );
}
