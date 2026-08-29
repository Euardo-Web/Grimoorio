import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import api, { formatApiError, API_BASE } from "@/lib/api";
import DiceRoller from "@/components/DiceRoller";
import { toast } from "sonner";
import { Copy, Plus, Trash, UploadSimple, FileText, Image as ImageIcon, UserCircle } from "@phosphor-icons/react";

export default function CampaignDetail() {
  const { id } = useParams();
  const [c, setC] = useState(null);
  const [tab, setTab] = useState("overview");
  const [chars, setChars] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [files, setFiles] = useState([]);
  const [sessionForm, setSessionForm] = useState({ title: "", content: "" });
  const [npcForm, setNpcForm] = useState({ name: "", kind: "npc", description: "" });

  const loadAll = async () => {
    try {
      const [cData, chData, sData, nData, fData] = await Promise.all([
        api.get(`/campaigns/${id}`),
        api.get(`/characters?campaign_id=${id}`),
        api.get(`/sessions?campaign_id=${id}`),
        api.get(`/npcs?campaign_id=${id}`),
        api.get(`/files?campaign_id=${id}`),
      ]);
      setC(cData.data); setChars(chData.data); setSessions(sData.data); setNpcs(nData.data); setFiles(fData.data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { loadAll(); }, [id]);

  const copyCode = () => { navigator.clipboard.writeText(c.invite_code); toast.success("Código copiado!"); };

  const addSession = async (e) => {
    e.preventDefault();
    try { await api.post("/sessions", { ...sessionForm, campaign_id: id }); setSessionForm({ title: "", content: "" }); loadAll(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const delSession = async (sid) => { await api.delete(`/sessions/${sid}`); loadAll(); };

  const addNpc = async (e) => {
    e.preventDefault();
    try { await api.post("/npcs", { ...npcForm, campaign_id: id }); setNpcForm({ name: "", kind: "npc", description: "" }); loadAll(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const delNpc = async (nid) => { await api.delete(`/npcs/${nid}`); loadAll(); };

  const uploadFile = () => {
    const inp = document.createElement("input"); inp.type = "file";
    inp.onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const fd = new FormData(); fd.append("file", f); fd.append("campaign_id", id);
      await api.post("/files/upload", fd); toast.success("Arquivo enviado"); loadAll();
    };
    inp.click();
  };
  const delFile = async (fid) => { await api.delete(`/files/${fid}`); loadAll(); };

  if (!c) return <Layout><div className="text-gray-500">Carregando...</div></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs text-gray-500 font-mono mb-1">// campanha • {c.system.toUpperCase()}</div>
            <h1 className="font-display text-4xl md:text-5xl font-bold">{c.name}</h1>
            <p className="text-gray-400 mt-2 max-w-2xl">{c.description}</p>
          </div>
          <button onClick={copyCode} data-testid="copy-invite-btn"
            className="border border-white/10 hover:border-[#FF4500] px-4 py-2 rounded-sm text-sm flex items-center gap-2">
            <Copy size={14} /> Convite: <span className="font-mono text-[#FF4500]">{c.invite_code}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="flex gap-1 border-b border-white/10 mb-6 overflow-x-auto scroll-thin">
              {[["overview","Visão geral"],["sessions","Diário"],["npcs","NPCs / Bestiário"],["files","Galeria"],["party","Grupo"]].map(([k, lbl]) => (
                <button key={k} onClick={() => setTab(k)} data-testid={`ctab-${k}`}
                  className={`px-4 py-2 text-sm whitespace-nowrap ${tab === k ? "border-b-2 border-[#FF4500] text-white" : "text-gray-500 hover:text-white"}`}>
                  {lbl}
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <div className="space-y-4">
                <div className="border border-white/10 p-6 rounded-sm bg-[#12121A]">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div><div className="text-3xl font-display font-bold text-[#FF4500]">{c.members?.length || 0}</div><div className="text-xs text-gray-500 font-mono">MEMBROS</div></div>
                    <div><div className="text-3xl font-display font-bold text-[#FF4500]">{chars.length}</div><div className="text-xs text-gray-500 font-mono">FICHAS</div></div>
                    <div><div className="text-3xl font-display font-bold text-[#FF4500]">{sessions.length}</div><div className="text-xs text-gray-500 font-mono">SESSÕES</div></div>
                  </div>
                </div>
              </div>
            )}

            {tab === "sessions" && (
              <div>
                {c.is_master && (
                  <form onSubmit={addSession} className="border border-white/10 p-4 rounded-sm bg-[#12121A] mb-4" data-testid="session-form">
                    <input required value={sessionForm.title} onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                      placeholder="Título da sessão" data-testid="session-title-input"
                      className="w-full bg-[#0A0A0E] border border-white/10 rounded-sm px-3 py-2 mb-2" />
                    <textarea required value={sessionForm.content} onChange={(e) => setSessionForm({ ...sessionForm, content: e.target.value })}
                      placeholder="Notas, resumo, plot hooks..." rows={4} data-testid="session-content-input"
                      className="w-full bg-[#0A0A0E] border border-white/10 rounded-sm px-3 py-2 mb-2" />
                    <button className="bg-[#FF4500] text-black font-medium px-4 py-1.5 rounded-sm text-sm" data-testid="add-session-btn">Registrar sessão</button>
                  </form>
                )}
                <div className="space-y-3">
                  {sessions.map((s) => (
                    <div key={s.id} className="border border-white/10 p-4 rounded-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-display text-xl font-semibold">{s.title}</div>
                          <div className="text-xs text-gray-500 font-mono">{new Date(s.created_at).toLocaleString()}</div>
                        </div>
                        {c.is_master && <button onClick={() => delSession(s.id)} className="text-gray-500 hover:text-red-400"><Trash size={14} /></button>}
                      </div>
                      <div className="text-sm text-gray-300 whitespace-pre-wrap">{s.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "npcs" && (
              <div>
                {c.is_master && (
                  <form onSubmit={addNpc} className="border border-white/10 p-4 rounded-sm bg-[#12121A] mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                      <input required value={npcForm.name} onChange={(e) => setNpcForm({ ...npcForm, name: e.target.value })}
                        placeholder="Nome" data-testid="npc-name-input" className="bg-[#0A0A0E] border border-white/10 rounded-sm px-3 py-2" />
                      <select value={npcForm.kind} onChange={(e) => setNpcForm({ ...npcForm, kind: e.target.value })}
                        data-testid="npc-kind-select" className="bg-[#0A0A0E] border border-white/10 rounded-sm px-3 py-2">
                        <option value="npc">NPC</option>
                        <option value="monster">Monstro</option>
                      </select>
                      <button className="bg-[#FF4500] text-black font-medium rounded-sm text-sm" data-testid="add-npc-btn"><Plus size={14} className="inline"/> Adicionar</button>
                    </div>
                    <textarea value={npcForm.description} onChange={(e) => setNpcForm({ ...npcForm, description: e.target.value })}
                      placeholder="Descrição, motivação, stats..." rows={2}
                      className="w-full bg-[#0A0A0E] border border-white/10 rounded-sm px-3 py-2" />
                  </form>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {npcs.map((n) => (
                    <div key={n.id} className="border border-white/10 p-4 rounded-sm">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-display text-lg font-semibold">{n.name}</div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 border rounded-sm ${n.kind === "monster" ? "border-red-500 text-red-400" : "border-white/20 text-gray-400"}`}>
                          {n.kind === "monster" ? "MONSTRO" : "NPC"}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 whitespace-pre-wrap">{n.description}</div>
                      {c.is_master && <button onClick={() => delNpc(n.id)} className="mt-2 text-xs text-gray-500 hover:text-red-400">Excluir</button>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "files" && (
              <div>
                <button onClick={uploadFile} data-testid="upload-file-btn"
                  className="bg-[#FF4500] hover:bg-[#FF6347] text-black font-medium px-4 py-2 rounded-sm text-sm flex items-center gap-2 mb-4">
                  <UploadSimple size={16} /> Enviar arquivo
                </button>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {files.map((f) => {
                    const isImg = f.content_type?.startsWith("image/");
                    const url = `${API_BASE.replace(/\/api$/, "")}${f.url}`;
                    return (
                      <div key={f.id} className="border border-white/10 rounded-sm overflow-hidden group">
                        {isImg ? (
                          <a href={url} target="_blank" rel="noreferrer">
                            <img src={url} alt="" className="w-full h-32 object-cover" />
                          </a>
                        ) : (
                          <a href={url} target="_blank" rel="noreferrer" className="h-32 flex items-center justify-center bg-[#0A0A0E]">
                            <FileText size={40} className="text-gray-500" />
                          </a>
                        )}
                        <div className="p-2 flex justify-between items-center">
                          <div className="text-xs truncate flex-1">{f.original_filename}</div>
                          <button onClick={() => delFile(f.id)} className="text-gray-500 hover:text-red-400"><Trash size={12} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {tab === "party" && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-display text-xl font-semibold mb-3">Membros</h3>
                  <div className="space-y-2">
                    {c.members?.map((m) => (
                      <div key={m.id} className="border border-white/10 p-3 rounded-sm flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <UserCircle size={20} className="text-gray-400" />
                          <div>
                            <div>{m.name}</div>
                            <div className="text-xs text-gray-500 font-mono">{m.email}</div>
                          </div>
                        </div>
                        <span className={`text-xs font-mono px-2 py-0.5 border rounded-sm ${m.role === "master" ? "border-[#FF4500] text-[#FF4500]" : "border-white/20 text-gray-400"}`}>
                          {m.role === "master" ? "MESTRE" : "JOGADOR"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold mb-3">Personagens do grupo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {chars.map((ch) => (
                      <Link key={ch.id} to={`/app/characters/${ch.id}`} className="border border-white/10 hover:border-[#FF4500]/50 p-4 rounded-sm">
                        <div className="font-display text-lg">{ch.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{ch.race} {ch.class_name} • NV {ch.level}</div>
                        <div className="text-xs font-mono mt-2 text-[#FF4500]">HP {ch.hp_current}/{ch.hp_max}</div>
                      </Link>
                    ))}
                    {chars.length === 0 && <div className="text-gray-500 text-sm">Ninguém vinculou fichas ainda.</div>}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-[600px] sticky top-24">
            <DiceRoller campaignId={c.id} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
