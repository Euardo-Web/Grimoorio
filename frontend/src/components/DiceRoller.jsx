import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { DiceSix, Cube, Sparkle } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

const PRESETS = ["1d20", "1d20+3", "1d20+5", "2d6", "1d8+3", "1d4", "1d100"];

export default function DiceRoller({ campaignId, characterId, compact = false }) {
  const [rolls, setRolls] = useState([]);
  const [expr, setExpr] = useState("1d20");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const lastSince = useRef(null);
  const containerRef = useRef(null);

  const loadRolls = async () => {
    try {
      const params = {};
      if (campaignId) params.campaign_id = campaignId;
      const { data } = await api.get("/rolls", { params });
      setRolls(data);
      if (data.length) lastSince.current = data[data.length - 1].created_at;
    } catch {}
  };

  useEffect(() => {
    let mounted = true;
    const initLoad = async () => {
      try {
        const params = {};
        if (campaignId) params.campaign_id = campaignId;
        const { data } = await api.get("/rolls", { params });
        if (!mounted) return;
        setRolls(data);
        if (data.length) lastSince.current = data[data.length - 1].created_at;
      } catch {}
    };
    initLoad();
    if (!campaignId) return () => { mounted = false; };
    const t = setInterval(async () => {
      try {
        const params = { campaign_id: campaignId };
        if (lastSince.current) params.since = lastSince.current;
        const { data } = await api.get("/rolls", { params });
        if (!mounted) return;
        if (data.length) {
          setRolls((prev) => [...prev, ...data].slice(-100));
          lastSince.current = data[data.length - 1].created_at;
        }
      } catch {}
    }, 3000);
    return () => { mounted = false; clearInterval(t); };
    // eslint-disable-next-line
  }, [campaignId]);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [rolls]);

  const roll = async (expression) => {
    setLoading(true); setError("");
    try {
      await api.post("/rolls", { expression, campaign_id: campaignId, character_id: characterId, label });
      await loadRolls();
      setLabel("");
    } catch (e) {
      setError(e.response?.data?.detail || "Erro na rolagem");
    } finally { setLoading(false); }
  };

  return (
    <div className={`glass rounded-sm ${compact ? "p-3" : "p-4"} flex flex-col h-full`} data-testid="dice-roller">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
        <DiceSix size={20} className="text-[#FF4500]" weight="fill" />
        <h3 className="font-display text-lg font-semibold">Rolagem</h3>
        {campaignId && <span className="text-xs text-gray-500 ml-auto font-mono">ao vivo</span>}
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto scroll-thin min-h-[180px] mb-3 space-y-2">
        {rolls.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8">
            Nenhuma rolagem ainda. Solte os dados!
          </div>
        )}
        <AnimatePresence initial={false}>
          {rolls.map((r) => {
            const isCrit = r.breakdown?.some((b) => b.rolls?.includes(20));
            const isFumble = r.breakdown?.some((b) => b.rolls?.includes(1) && b.dice === "1d20");
            return (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`p-2 border-l-2 ${isCrit ? "border-[#FF4500] ember-inset" : isFumble ? "border-red-500" : "border-white/10"} bg-white/[0.02]`}
                data-testid="roll-entry"
              >
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-gray-400 font-mono">{r.user_name}</span>
                  <span className={`font-mono text-2xl font-bold ${isCrit ? "text-[#FF4500]" : "text-white"}`}>{r.total}</span>
                </div>
                {r.label && <div className="text-xs text-gray-300 mt-1">{r.label}</div>}
                <div className="text-xs text-gray-500 font-mono mt-1">
                  {r.expression} → {r.breakdown?.map((b, i) =>
                    b.rolls ? `[${b.rolls.join(",")}]` : (b.modifier >= 0 ? `+${b.modifier}` : `${b.modifier}`)
                  ).join(" ")}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            placeholder="1d20+5"
            data-testid="dice-expr-input"
            className="flex-1 bg-[#12121A] border border-white/10 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#FF4500]"
          />
          <button
            onClick={() => roll(expr)}
            disabled={loading || !expr}
            data-testid="roll-btn"
            className="px-4 py-2 bg-[#FF4500] hover:bg-[#FF6347] disabled:opacity-50 text-black font-medium rounded-sm text-sm flex items-center gap-1"
          >
            <Cube size={16} weight="fill" /> Rolar
          </button>
        </div>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Rótulo (ex: Ataque com espada)"
          data-testid="dice-label-input"
          className="w-full bg-[#12121A] border border-white/10 rounded-sm px-3 py-1.5 text-xs focus:outline-none focus:border-white/20"
        />
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => { setExpr(p); roll(p); }}
              data-testid={`preset-${p}`}
              className="text-xs px-2 py-1 border border-white/10 hover:border-[#FF4500] hover:text-[#FF4500] font-mono rounded-sm"
            >
              {p}
            </button>
          ))}
        </div>
        {error && <div className="text-red-400 text-xs" data-testid="dice-error">{error}</div>}
      </div>
    </div>
  );
}
