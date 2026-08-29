import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Plus, Books, Globe, DownloadSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function TemplatesPage() {
  const { user } = useAuth();
  const [scope, setScope] = useState("mine");
  const [items, setItems] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", system: "custom", description: "", is_public: false });

  const load = async () => {
    const { data } = await api.get(`/templates?scope=${scope}`);
    setItems(data);
  };
  useEffect(() => { load(); }, [scope]);

  const create = async (e) => {
    e.preventDefault();
    try { await api.post("/templates", form); toast.success("Modelo criado"); setCreating(false); setForm({ name: "", system: "custom", description: "", is_public: false }); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const install = async (id) => {
    try { await api.post(`/templates/${id}/install`); toast.success("Adicionado aos seus modelos"); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const remove = async (id) => {
    if (!window.confirm("Excluir modelo?")) return;
    await api.delete(`/templates/${id}`); load();
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-6">
          <div>
            <div className="text-xs text-gray-500 font-mono mb-1">// modelos de ficha</div>
            <h1 className="font-display text-4xl md:text-5xl font-bold">Sistemas & Modelos</h1>
            <p className="text-gray-400 mt-2">Crie um esqueleto de ficha ou instale modelos da comunidade.</p>
          </div>
          {user?.role === "master" && (
            <button onClick={() => setCreating(!creating)} data-testid="create-template-btn"
              className="bg-[#FF4500] hover:bg-[#FF6347] text-black font-medium px-4 py-2 rounded-sm text-sm flex items-center gap-2">
              <Plus size={16} weight="bold" /> Novo modelo
            </button>
          )}
        </div>

        <div className="flex gap-1 border-b border-white/10 mb-6">
          {[["mine","Meus modelos", Books],["public","Biblioteca pública", Globe]].map(([k, lbl, Icon]) => (
            <button key={k} onClick={() => setScope(k)} data-testid={`scope-${k}`}
              className={`px-4 py-2 text-sm flex items-center gap-2 ${scope === k ? "border-b-2 border-[#FF4500] text-white" : "text-gray-500 hover:text-white"}`}>
              <Icon size={14} /> {lbl}
            </button>
          ))}
        </div>

        {creating && (
          <form onSubmit={create} className="border border-white/10 p-6 rounded-sm bg-[#12121A] mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome do modelo" data-testid="template-name-input"
                className="bg-[#0A0A0E] border border-white/10 rounded-sm px-3 py-2" />
              <select value={form.system} onChange={(e) => setForm({ ...form, system: e.target.value })}
                data-testid="template-system-select"
                className="bg-[#0A0A0E] border border-white/10 rounded-sm px-3 py-2">
                <option value="dnd5e">D&D 5ª Edição</option>
                <option value="tormenta">Tormenta20</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descreva quando usar este modelo..." rows={2}
              className="w-full bg-[#0A0A0E] border border-white/10 rounded-sm px-3 py-2 mb-4" />
            <label className="flex items-center gap-2 mb-4 text-sm">
              <input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                data-testid="template-public-check" />
              Publicar na biblioteca pública para outros mestres
            </label>
            <button className="bg-[#FF4500] text-black font-medium px-4 py-2 rounded-sm text-sm" data-testid="template-submit-btn">Criar modelo</button>
          </form>
        )}

        {items.length === 0 ? (
          <div className="border border-dashed border-white/10 p-16 text-center rounded-sm text-gray-500">
            {scope === "mine" ? "Você ainda não criou modelos." : "A biblioteca pública está vazia. Seja o primeiro a publicar!"}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((t) => (
              <div key={t.id} className="border border-white/10 hover:border-[#FF4500]/50 bg-[#12121A] p-5 rounded-sm">
                <div className="flex justify-between items-start mb-2">
                  <Link to={scope === "mine" ? `/app/templates/${t.id}` : "#"} className="font-display text-xl font-bold hover:text-[#FF4500]">{t.name}</Link>
                  {t.is_public && <span className="text-[10px] font-mono px-2 py-0.5 border border-[#FF4500] text-[#FF4500] rounded-sm">PÚBLICO</span>}
                </div>
                <div className="text-xs text-gray-500 font-mono uppercase mb-2">{t.system}</div>
                <div className="text-sm text-gray-400 line-clamp-2 mb-3">{t.description || "Sem descrição"}</div>
                <div className="text-xs text-gray-500 font-mono mb-3">
                  Por {t.author_name} • {t.installs || 0} instalações
                </div>
                <div className="flex gap-2">
                  {scope === "public" ? (
                    <button onClick={() => install(t.id)} data-testid={`install-${t.id}`}
                      className="flex-1 border border-[#FF4500] text-[#FF4500] hover:bg-[#FF4500]/10 px-3 py-1.5 rounded-sm text-sm flex items-center justify-center gap-1">
                      <DownloadSimple size={14} /> Instalar
                    </button>
                  ) : (
                    <>
                      <Link to={`/app/templates/${t.id}`} className="flex-1 border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-sm text-sm text-center">Editar</Link>
                      <button onClick={() => remove(t.id)} className="p-1.5 text-gray-500 hover:text-red-400"><Trash size={14} /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
