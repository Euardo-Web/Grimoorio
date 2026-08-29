import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { Plus, Copy, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function CharactersPage() {
  const [chars, setChars] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", campaign_id: "", system: "dnd5e", class_name: "", race: "", level: 1 });

  const load = async () => {
    const [c, camps] = await Promise.all([api.get("/characters"), api.get("/campaigns")]);
    setChars(c.data); setCampaigns(camps.data);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, campaign_id: form.campaign_id || null };
      const { data } = await api.post("/characters", payload);
      toast.success("Personagem criado!");
      setCreating(false); setForm({ name: "", campaign_id: "", system: "dnd5e", class_name: "", race: "", level: 1 });
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const duplicate = async (id, e) => {
    e.preventDefault(); e.stopPropagation();
    try {
      await api.post(`/characters/${id}/duplicate`);
      toast.success("Duplicado!");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const remove = async (id, e) => {
    e.preventDefault(); e.stopPropagation();
    if (!window.confirm("Excluir personagem?")) return;
    await api.delete(`/characters/${id}`);
    toast.success("Excluído"); load();
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <div className="text-xs text-gray-500 font-mono mb-1">// personagens</div>
            <h1 className="font-display text-4xl md:text-5xl font-bold">Sua Guilda</h1>
          </div>
          <button onClick={() => setCreating(!creating)} data-testid="create-char-btn"
            className="bg-[#FF4500] hover:bg-[#FF6347] text-black font-medium px-4 py-2 rounded-sm text-sm flex items-center gap-2">
            <Plus size={16} weight="bold" /> Novo Personagem
          </button>
        </div>

        {creating && (
          <form onSubmit={create} className="border border-white/10 p-6 rounded-sm bg-[#12121A] mb-6" data-testid="char-create-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 font-mono mb-1">NOME</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  data-testid="char-name-input"
                  className="w-full bg-[#0A0A0E] border border-white/10 rounded-sm px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-mono mb-1">CAMPANHA (opcional)</label>
                <select value={form.campaign_id} onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}
                  data-testid="char-campaign-select"
                  className="w-full bg-[#0A0A0E] border border-white/10 rounded-sm px-3 py-2">
                  <option value="">— nenhuma —</option>
                  {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-mono mb-1">CLASSE</label>
                <input value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                  data-testid="char-class-input"
                  className="w-full bg-[#0A0A0E] border border-white/10 rounded-sm px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-mono mb-1">RAÇA</label>
                <input value={form.race} onChange={(e) => setForm({ ...form, race: e.target.value })}
                  data-testid="char-race-input"
                  className="w-full bg-[#0A0A0E] border border-white/10 rounded-sm px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-mono mb-1">NÍVEL</label>
                <input type="number" min={1} value={form.level} onChange={(e) => setForm({ ...form, level: parseInt(e.target.value) || 1 })}
                  data-testid="char-level-input"
                  className="w-full bg-[#0A0A0E] border border-white/10 rounded-sm px-3 py-2 font-mono" />
              </div>
            </div>
            <button type="submit" data-testid="char-create-submit"
              className="mt-4 bg-[#FF4500] hover:bg-[#FF6347] text-black font-medium px-4 py-2 rounded-sm">Criar</button>
          </form>
        )}

        {chars.length === 0 ? (
          <div className="border border-dashed border-white/10 p-16 text-center rounded-sm text-gray-500">
            Nenhum personagem. Crie seu primeiro herói.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chars.map((c) => (
              <Link key={c.id} to={`/app/characters/${c.id}`} data-testid={`char-${c.id}`}
                className="group border border-white/10 hover:border-[#FF4500]/60 bg-[#12121A] p-5 rounded-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="font-display text-xl font-bold group-hover:text-[#FF4500]">{c.name}</div>
                  <div className="flex gap-1">
                    <button onClick={(e) => duplicate(c.id, e)} data-testid={`dup-${c.id}`}
                      className="p-1.5 text-gray-500 hover:text-white"><Copy size={14} /></button>
                    <button onClick={(e) => remove(c.id, e)} data-testid={`del-${c.id}`}
                      className="p-1.5 text-gray-500 hover:text-red-400"><Trash size={14} /></button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 font-mono mb-3">
                  {c.race || "—"} {c.class_name || ""} • NV {c.level}
                </div>
                <div className="flex gap-4 text-xs font-mono">
                  <div><span className="text-gray-500">HP</span> <span className="text-[#FF4500]">{c.hp_current}/{c.hp_max}</span></div>
                  <div><span className="text-gray-500">CA</span> <span className="text-white">{c.armor_class}</span></div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
