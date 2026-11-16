import { ResourceImage, ImagePicker, uploadResourceImage, removeResourceImage } from "@/components/ResourceImage";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/api";
import { Plus, Trash, FloppyDisk, ArrowLeft } from "@phosphor-icons/react";
import { toast } from "sonner";

const inputClass = "w-full bg-[#101416] border border-white/10 rounded-sm px-3 py-2";
export default function TemplateEditor() {
  const { id } = useParams();
  const { user } = useAuth();
  const [t, setT] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const editable = t?.author_id === user?.id;
  useEffect(() => {
    let active = true;
    setT(null); setError(""); setDirty(false);
    api.get(`/templates/${id}`).then(({ data }) => { if (active) setT(data); })
      .catch((e) => { if (active) setError(formatApiError(e)); });
    return () => { active = false; };
  }, [id]);
  useEffect(() => {
    const warn = (event) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const change = (patch) => { setT((prev) => ({ ...prev, ...patch })); setDirty(true); };
  const schemaChange = (kind, index, key, value) => change({ [kind]: t[kind].map((entry, i) => i === index ? { ...entry, [key]: value } : entry) });
  const sectionChange = (index, patch) => change({ sections: t.sections.map((section, i) => i === index ? { ...section, ...patch } : section) });
  const fieldChange = (sectionIndex, fieldIndex, patch) => sectionChange(sectionIndex, { fields: t.sections[sectionIndex].fields.map((field, i) => i === fieldIndex ? { ...field, ...patch } : field) });
  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/templates/${id}`, {
        name: t.name, system: t.system, description: t.description, is_public: t.is_public,
        attributes_schema: t.attributes_schema, skills_schema: t.skills_schema, sections: t.sections
      });
      setT((prev) => ({ ...data, cover_file_id: prev.cover_file_id })); setDirty(false); toast.success("Modelo salvo.");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };
  if (error) return <Layout><div role="alert" className="journal-panel p-6">{error}<Link className="block mt-4 text-[#D5AB68]" to="/app/templates">Voltar aos modelos</Link></div></Layout>;
  if (!t) return <Layout><p role="status">Abrindo seu modelo…</p></Layout>;
  return <Layout><div className="max-w-6xl mx-auto">
    <Link to="/app/templates" className="inline-flex items-center gap-2 text-sm text-gray-400 mb-6"><ArrowLeft size={16} /> Modelos de ficha</Link>
    <div className="flex justify-between items-end gap-4 mb-8">
      <div><div className="journal-label">Oficina de modelos</div><h1 className="font-display text-4xl mt-2">{t.name || "Novo modelo"}</h1><p className="text-gray-400 mt-2">Dê forma às regras da sua mesa. Veja a ficha tomar vida ao lado.</p></div>
      {editable && <button disabled={saving || !dirty} onClick={save} data-testid="tpl-save-btn" className="bg-[#D5AB68] text-black px-5 py-3 rounded-sm flex gap-2 items-center disabled:opacity-50"><FloppyDisk size={18} />{saving ? "Salvando…" : dirty ? "Salvar alterações" : "Tudo salvo"}</button>}
    </div>
    {!editable && <p className="journal-panel p-4 mb-6">Prévia de leitura. Instale um modelo público na biblioteca para editar sua própria cópia.</p>}
    <div className="template-editor-grid">
      <fieldset disabled={!editable || saving} className="min-w-0 space-y-5">
        <section className="journal-panel p-5">
          <h2 className="font-display text-2xl mb-4">A capa do seu sistema</h2>
          <ImagePicker label="Capa do modelo" assetId={t.cover_file_id} disabled={!editable || saving}
            onSelect={async (file) => {
              const updated = await uploadResourceImage("templates", id, file);
              setT((prev) => ({ ...prev, cover_file_id: updated.cover_file_id }));
              toast.success("Capa atualizada.");
            }}
            onRemove={async () => {
              await removeResourceImage("templates", id);
              setT((prev) => ({ ...prev, cover_file_id: null }));
            }} />
        </section>
        <section className="journal-panel p-5 space-y-4">
          <h2 className="font-display text-2xl">A identidade do sistema</h2>
          <label className="block text-sm">Nome<input required maxLength={120} className={inputClass} value={t.name} onChange={(e) => change({ name: e.target.value })} data-testid="tpl-name-input" /></label>
          <label className="block text-sm">Sistema<select className={inputClass} value={t.system} onChange={(e) => change({ system: e.target.value })}><option value="dnd5e">D&D 5e</option><option value="tormenta">Tormenta20</option><option value="custom">Personalizado</option>{!["dnd5e","tormenta","custom"].includes(t.system) && <option value={t.system}>{t.system}</option>}</select></label>
          <label className="block text-sm">Descrição<textarea rows={3} className={inputClass} value={t.description} onChange={(e) => change({ description: e.target.value })} /></label>
          <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={t.is_public} onChange={(e) => change({ is_public: e.target.checked })} /> Compartilhar na biblioteca pública</label>
        </section>
        {[["attributes_schema","Atributos"],["skills_schema","Perícias"]].map(([kind, title]) => <section className="journal-panel p-5" key={kind}>
          <div className="flex justify-between items-center"><h2 className="font-display text-2xl">{title}</h2><button onClick={() => change({ [kind]: [...(t[kind] || []), { key: "", label: "" }] })} className="text-[#D5AB68] text-sm inline-flex gap-1 items-center"><Plus size={16} /> Adicionar</button></div>
          <p className="text-xs text-gray-400 my-3">A chave identifica o campo. Use letras, números e sublinhado, começando com uma letra.</p>
          {(t[kind] || []).map((entry, i) => <div className="editor-row" key={i}>
            <input aria-label={`Chave de ${title} ${i+1}`} placeholder="Chave: forca" value={entry.key} onChange={(e) => schemaChange(kind,i,"key",e.target.value)} />
            <input aria-label={`Nome de ${title} ${i+1}`} placeholder="Nome: Força" value={entry.label} onChange={(e) => schemaChange(kind,i,"label",e.target.value)} />
            <button aria-label={`Remover ${entry.label || "campo"}`} onClick={() => change({ [kind]: t[kind].filter((_,x) => x !== i) })}><Trash size={18} /></button>
          </div>)}
          {!(t[kind] || []).length && <p className="text-sm text-gray-400 py-4">Adicione os primeiros campos do seu sistema.</p>}
        </section>)}
        <section className="journal-panel p-5">
          <h2 className="font-display text-2xl">Seções personalizadas</h2><p className="text-sm text-gray-400 mt-2 mb-4">Recursos, vínculos, poderes e o que mais sua história precisar.</p>
          {(t.sections || []).map((section, si) => <div className="custom-section" key={si}>
            <div className="editor-row"><input aria-label="Nome da seção" value={section.label || section.title || ""} onChange={(e) => sectionChange(si,{ label:e.target.value })} placeholder="Nome da seção" /><button aria-label="Remover seção" onClick={() => change({ sections:t.sections.filter((_,i) => i !== si) })}><Trash size={18} /></button></div>
            {(section.fields || []).map((field, fi) => <div className="editor-row" key={fi}>
              <input aria-label="Chave do campo" placeholder="Chave" value={field.key} onChange={(e) => fieldChange(si,fi,{ key:e.target.value })} />
              <input aria-label="Nome do campo" placeholder="Nome" value={field.label} onChange={(e) => fieldChange(si,fi,{ label:e.target.value })} />
              <select aria-label="Tipo do campo" value={field.type || "text"} onChange={(e) => fieldChange(si,fi,{ type:e.target.value })}><option value="text">Texto</option><option value="number">Número</option><option value="textarea">Texto longo</option><option value="checkbox">Marcação</option></select>
              <button aria-label="Remover campo" onClick={() => sectionChange(si,{ fields:section.fields.filter((_,i) => i !== fi) })}><Trash size={18} /></button>
            </div>)}
            <button className="text-sm text-[#D5AB68] mt-2" onClick={() => sectionChange(si,{ fields:[...(section.fields || []),{ key:"",label:"",type:"text" }] })}>+ Adicionar campo</button>
          </div>)}
          <button className="text-sm text-[#D5AB68] mt-4" onClick={() => change({ sections:[...(t.sections || []),{ key:`section_${Date.now()}`,label:"Nova seção",fields:[] }] })}>+ Criar seção</button>
        </section>
      </fieldset>
      <aside className="journal-panel template-preview" aria-label="Prévia do modelo">
        <ResourceImage assetId={t.cover_file_id} className="template-preview-cover" alt={`Capa de ${t.name}`} initials={t.name?.slice(0,1)} />
        <div className="journal-label">Prévia da ficha</div><h2 className="font-display text-3xl mt-4">{t.name || "Seu próximo personagem"}</h2><p className="text-sm text-gray-400 mt-2 mb-6">{t.description || "A história começa aqui."}</p>
        <div className="grid grid-cols-3 gap-2">{(t.attributes_schema || []).map((field,i) => <div key={i} className="border border-white/10 rounded-sm p-3 text-center"><div className="text-xs text-gray-400 truncate">{field.label || "Atributo"}</div><div className="font-display text-3xl text-[#D5AB68]">10</div></div>)}</div>
        {!!t.skills_schema?.length && <div className="mt-5"><h3 className="font-display text-xl mb-2">Perícias</h3>{t.skills_schema.map((field,i) => <div key={i} className="flex justify-between text-sm border-b border-white/10 py-2"><span>{field.label || "Perícia"}</span><span className="text-[#D5AB68]">+0</span></div>)}</div>}
        {(t.sections || []).map((section,i) => <section className="custom-section" key={i}><h3 className="font-display text-xl">{section.label || section.title}</h3>{(section.fields || []).map((field,j) => <label className="block text-sm text-gray-400 mt-3" key={j}>{field.type === "checkbox" ? <><input type="checkbox" disabled />{field.label}</> : <>{field.label}{field.type === "textarea" ? <textarea disabled rows={2} placeholder="Texto do personagem" /> : <input disabled placeholder={field.type === "number" ? "0" : "Texto do personagem"} />}</>}</label>)}</section>)}
        <p className="text-xs text-gray-400 mt-6">Valores ilustrativos. As fichas existentes preservam seus dados.</p>
      </aside>
    </div>
  </div></Layout>;
}
