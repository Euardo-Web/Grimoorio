import CampaignCard from "@/components/CampaignCard";
import { ImagePicker, uploadResourceImage } from "@/components/ResourceImage";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Plus, SignIn } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function CampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [form, setForm] = useState({ name: "", system: "dnd5e", description: "", template_id: "" });
  const [cover, setCover] = useState(null);
  const [saving, setSaving] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const load = async () => {
    const [c, t] = await Promise.all([api.get("/campaigns"), api.get("/templates?scope=mine")]);
    setCampaigns(c.data);
    setTemplates(t.data);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = { ...form, template_id: form.template_id || null };
      const { data } = await api.post("/campaigns", payload);
      if (cover) {
        try { await uploadResourceImage("campaigns", data.id, cover); }
        catch (error) { toast.error("Campanha criada, mas a capa não foi enviada: " + formatApiError(error)); }
      }
      setCover(null);
      toast.success("Campanha criada!");
      setForm({ name: "", system: "dnd5e", description: "", template_id: "" });
      setCreating(false);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  const join = async (e) => {
    e.preventDefault();
    try {
      await api.post("/campaigns/join", { code: joinCode });
      toast.success("Você entrou na campanha!");
      setJoinCode(""); setJoining(false); load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs text-gray-500 font-mono mb-1">// campanhas</div>
            <h1 className="font-display text-4xl md:text-5xl font-bold">Suas Mesas</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setJoining(!joining)} data-testid="join-campaign-btn"
              className="border border-white/10 hover:border-white/30 px-4 py-2 rounded-sm text-sm flex items-center gap-2">
              <SignIn size={16} /> Entrar com código
            </button>
            {user?.role === "master" && (
              <button onClick={() => setCreating(!creating)} data-testid="create-campaign-btn"
                className="bg-[#D5AB68] hover:bg-[#E5C38D] text-black font-medium px-4 py-2 rounded-sm text-sm flex items-center gap-2">
                <Plus size={16} weight="bold" /> Nova Campanha
              </button>
            )}
          </div>
        </div>

        {joining && (
          <form onSubmit={join} className="border border-white/10 p-6 rounded-sm bg-[#191F22] mb-6" data-testid="join-form">
            <label className="block text-xs text-gray-400 font-mono mb-1">CÓDIGO DE CONVITE</label>
            <div className="flex gap-2">
              <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                data-testid="join-code-input"
                className="flex-1 bg-[#101416] border border-white/10 rounded-sm px-3 py-2 font-mono uppercase tracking-wider" placeholder="ABC123" />
              <button type="submit" data-testid="join-submit-btn"
                className="bg-[#D5AB68] text-black font-medium px-4 rounded-sm">Entrar</button>
            </div>
          </form>
        )}

        {creating && (
          <form onSubmit={create} className="border border-white/10 p-6 rounded-sm bg-[#191F22] mb-6" data-testid="create-form">
            <div className="mb-4">
              <label className="block text-xs text-gray-400 font-mono mb-1">NOME</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                data-testid="campaign-name-input"
                className="w-full bg-[#101416] border border-white/10 rounded-sm px-3 py-2 focus:outline-none focus:border-[#D5AB68]" />
            </div>
            <div className="mb-4">
              <label className="block text-xs text-gray-400 font-mono mb-1">SISTEMA</label>
              <select value={form.system} onChange={(e) => setForm({ ...form, system: e.target.value })}
                data-testid="campaign-system-select"
                className="w-full bg-[#101416] border border-white/10 rounded-sm px-3 py-2">
                <option value="dnd5e">D&D 5ª Edição</option>
                <option value="tormenta">Tormenta20</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-xs text-gray-400 font-mono mb-1">MODELO DE FICHA (opcional)</label>
              <select value={form.template_id} onChange={(e) => setForm({ ...form, template_id: e.target.value })}
                data-testid="campaign-template-select"
                className="w-full bg-[#101416] border border-white/10 rounded-sm px-3 py-2">
                <option value="">— usar campos padrão —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.system}{t.cloned_from ? " • instalado" : ""})
                  </option>
                ))}
              </select>
              {templates.length === 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  Você ainda não tem modelos. Crie um ou instale um da <a href="/app/templates" className="text-[#D5AB68] hover:underline">biblioteca pública</a>.
                </div>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-xs text-gray-400 font-mono mb-1">DESCRIÇÃO</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3} data-testid="campaign-desc-input"
                className="w-full bg-[#101416] border border-white/10 rounded-sm px-3 py-2 focus:outline-none focus:border-[#D5AB68]" />
            </div>
            <ImagePicker label="Capa da campanha" file={cover} onSelect={setCover} onRemove={() => setCover(null)} disabled={saving} />
            <button type="submit" disabled={saving} data-testid="campaign-create-submit"
              className="bg-[#D5AB68] hover:bg-[#E5C38D] text-black font-medium px-4 py-2 rounded-sm">Criar</button>
          </form>
        )}

        {campaigns.length === 0 ? (
          <div className="border border-dashed border-white/10 p-16 text-center rounded-sm">
            <div className="text-gray-500 mb-2">Nenhuma campanha ainda.</div>
            {user?.role === "master" ? "Crie sua primeira campanha." : "Entre com um código de convite."}
          </div>
        ) : (
          <div className="campaign-grid">
            {campaigns.map((c) => <CampaignCard key={c.id} campaign={c} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}
