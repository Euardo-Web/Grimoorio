import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import api, { formatApiError } from "@/lib/api";
import { Plus, Trash, FloppyDisk } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function TemplateEditor() {
  const { id } = useParams();
  const [t, setT] = useState(null);

  useEffect(() => { (async () => {
    try { const { data } = await api.get(`/templates/${id}`); setT(data); }
    catch (e) { toast.error(formatApiError(e)); }
  })(); }, [id]);

  const save = async () => {
    try { const { data } = await api.patch(`/templates/${id}`, t); setT(data); toast.success("Salvo!"); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const addAttr = () => setT({ ...t, attributes_schema: [...(t.attributes_schema || []), { key: "", label: "" }] });
  const updAttr = (i, k, v) => { const a = [...t.attributes_schema]; a[i] = { ...a[i], [k]: v }; setT({ ...t, attributes_schema: a }); };
  const delAttr = (i) => setT({ ...t, attributes_schema: t.attributes_schema.filter((_, x) => x !== i) });

  const addSkill = () => setT({ ...t, skills_schema: [...(t.skills_schema || []), { key: "", label: "" }] });
  const updSkill = (i, k, v) => { const s = [...t.skills_schema]; s[i] = { ...s[i], [k]: v }; setT({ ...t, skills_schema: s }); };
  const delSkill = (i) => setT({ ...t, skills_schema: t.skills_schema.filter((_, x) => x !== i) });

  if (!t) return <Layout><div className="text-gray-500">Carregando...</div></Layout>;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <div className="text-xs text-gray-500 font-mono mb-1">// editando modelo</div>
            <input value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })}
              data-testid="tpl-name-input"
              className="bg-transparent font-display text-4xl md:text-5xl font-bold w-full outline-none focus:text-[#FF4500]" />
          </div>
          <button onClick={save} data-testid="tpl-save-btn"
            className="bg-[#FF4500] hover:bg-[#FF6347] text-black font-medium px-4 py-2 rounded-sm text-sm flex items-center gap-2">
            <FloppyDisk size={16} weight="fill" /> Salvar
          </button>
        </div>

        <div className="space-y-6">
          <div className="border border-white/10 p-6 rounded-sm bg-[#12121A]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-400 font-mono mb-1">SISTEMA</label>
                <select value={t.system} onChange={(e) => setT({ ...t, system: e.target.value })}
                  className="w-full bg-[#0A0A0E] border border-white/10 rounded-sm px-3 py-2">
                  <option value="dnd5e">D&D 5ª Edição</option>
                  <option value="tormenta">Tormenta20</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={t.is_public} onChange={(e) => setT({ ...t, is_public: e.target.checked })}
                    data-testid="tpl-public-check" />
                  Publicar na biblioteca pública
                </label>
              </div>
            </div>
            <textarea value={t.description || ""} onChange={(e) => setT({ ...t, description: e.target.value })}
              placeholder="Descrição do modelo..." rows={2}
              className="w-full bg-[#0A0A0E] border border-white/10 rounded-sm px-3 py-2" />
          </div>

          <div className="border border-white/10 p-6 rounded-sm bg-[#12121A]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-display text-xl font-semibold">Atributos</h3>
              <button onClick={addAttr} data-testid="add-tpl-attr-btn"
                className="text-xs border border-white/10 hover:border-[#FF4500] px-2 py-1 rounded-sm flex items-center gap-1"><Plus size={12} /> Adicionar</button>
            </div>
            <div className="space-y-2">
              {(t.attributes_schema || []).map((a, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={a.key} onChange={(e) => updAttr(i, "key", e.target.value)}
                    placeholder="chave (ex: str)" className="w-32 bg-[#0A0A0E] border border-white/10 rounded-sm px-2 py-1 text-sm font-mono" />
                  <input value={a.label} onChange={(e) => updAttr(i, "label", e.target.value)}
                    placeholder="Rótulo (ex: Força)" className="flex-1 bg-[#0A0A0E] border border-white/10 rounded-sm px-2 py-1 text-sm" />
                  <button onClick={() => delAttr(i)} className="p-1 text-gray-500 hover:text-red-400"><Trash size={14} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-white/10 p-6 rounded-sm bg-[#12121A]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-display text-xl font-semibold">Perícias padrão</h3>
              <button onClick={addSkill} data-testid="add-tpl-skill-btn"
                className="text-xs border border-white/10 hover:border-[#FF4500] px-2 py-1 rounded-sm flex items-center gap-1"><Plus size={12} /> Adicionar</button>
            </div>
            <div className="space-y-2">
              {(t.skills_schema || []).map((a, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={a.key} onChange={(e) => updSkill(i, "key", e.target.value)}
                    placeholder="chave" className="w-32 bg-[#0A0A0E] border border-white/10 rounded-sm px-2 py-1 text-sm font-mono" />
                  <input value={a.label} onChange={(e) => updSkill(i, "label", e.target.value)}
                    placeholder="Rótulo" className="flex-1 bg-[#0A0A0E] border border-white/10 rounded-sm px-2 py-1 text-sm" />
                  <button onClick={() => delSkill(i)} className="p-1 text-gray-500 hover:text-red-400"><Trash size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
