import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import api, { formatApiError, API_BASE } from "@/lib/api";
import DiceRoller from "@/components/DiceRoller";
import { Plus, Trash, Heart, Shield, Sparkle, Backpack, Bed, DownloadSimple, UploadSimple, Copy } from "@phosphor-icons/react";
import { toast } from "sonner";

const ATTR_LABELS = { str: "FOR", dex: "DES", con: "CON", int: "INT", wis: "SAB", cha: "CAR" };
const mod = (v) => Math.floor((v - 10) / 2);

export default function CharacterSheet() {
  const { id } = useParams();
  const [c, setC] = useState(null);
  const [tab, setTab] = useState("stats");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { const { data } = await api.get(`/characters/${id}`); setC(data); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, [id]);

  const save = async (patch) => {
    setSaving(true);
    try {
      const { data } = await api.put(`/characters/${id}`, { ...c, ...patch });
      setC(data);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  const setField = (k, v) => setC({ ...c, [k]: v });
  const setAttr = (k, v) => setC({ ...c, attributes: { ...c.attributes, [k]: parseInt(v) || 0 } });

  const addSkill = () => setC({ ...c, skills: [...(c.skills || []), { name: "Nova perícia", value: 0, bonus: 0 }] });
  const updSkill = (i, k, v) => {
    const s = [...c.skills]; s[i] = { ...s[i], [k]: k === "name" ? v : (parseInt(v) || 0) };
    setC({ ...c, skills: s });
  };
  const delSkill = (i) => setC({ ...c, skills: c.skills.filter((_, x) => x !== i) });

  const addSpell = () => setC({ ...c, spells: [...(c.spells || []), { name: "Nova magia", level: 1, prepared: false, description: "" }] });
  const updSpell = (i, k, v) => {
    const s = [...c.spells]; s[i] = { ...s[i], [k]: v }; setC({ ...c, spells: s });
  };
  const delSpell = (i) => setC({ ...c, spells: c.spells.filter((_, x) => x !== i) });

  const setSlot = (lvl, k, v) => {
    const slots = { ...c.spell_slots, [lvl]: { ...(c.spell_slots[lvl] || { max: 0, current: 0 }), [k]: parseInt(v) || 0 } };
    setC({ ...c, spell_slots: slots });
  };

  const addItem = () => setC({ ...c, inventory: [...(c.inventory || []), { name: "Novo item", qty: 1, weight: 0, category: "misc", equipped: false }] });
  const updItem = (i, k, v) => {
    const it = [...c.inventory]; it[i] = { ...it[i], [k]: v }; setC({ ...c, inventory: it });
  };
  const delItem = (i) => setC({ ...c, inventory: c.inventory.filter((_, x) => x !== i) });
  const dupItem = (i) => setC({ ...c, inventory: [...c.inventory, { ...c.inventory[i] }] });

  const rest = async (kind) => {
    try { const { data } = await api.post(`/characters/${id}/rest?kind=${kind}`); setC(data); toast.success(`Descanso ${kind === "long" ? "longo" : "curto"} concluído`); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const exportJson = async () => {
    const { data } = await api.get(`/characters/${id}/export`);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${c.name}.json`; a.click();
  };

  const importJson = () => {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "application/json";
    inp.onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const txt = await f.text();
      try { const parsed = JSON.parse(txt); await api.post("/characters/import", parsed); toast.success("Importado!"); }
      catch (err) { toast.error("JSON inválido"); }
    };
    inp.click();
  };

  const uploadAvatar = () => {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
    inp.onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const fd = new FormData(); fd.append("file", f);
      if (c.campaign_id) fd.append("campaign_id", c.campaign_id);
      const { data } = await api.post("/files/upload", fd);
      const url = `${API_BASE.replace(/\/api$/, "")}${data.url}`;
      await save({ avatar_url: url });
      toast.success("Avatar atualizado");
    };
    inp.click();
  };

  if (!c) return <Layout><div className="text-gray-500">Carregando...</div></Layout>;

  const totalWeight = (c.inventory || []).reduce((s, it) => s + (Number(it.weight) || 0) * (Number(it.qty) || 1), 0);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="border border-white/10 bg-[#12121A] p-6 rounded-sm mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            <button onClick={uploadAvatar} data-testid="upload-avatar-btn"
              className="w-32 h-32 border border-dashed border-white/20 rounded-sm flex items-center justify-center overflow-hidden bg-[#0A0A0E] hover:border-[#FF4500]">
              {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover" /> :
                <div className="text-xs text-gray-500 text-center p-2">Enviar avatar</div>}
            </button>
            <div className="flex-1">
              <input value={c.name} onChange={(e) => setField("name", e.target.value)} onBlur={() => save({})}
                data-testid="char-name" className="bg-transparent font-display text-4xl font-bold w-full outline-none focus:text-[#FF4500]" />
              <div className="flex flex-wrap gap-3 mt-2">
                <input value={c.race} onChange={(e) => setField("race", e.target.value)} onBlur={() => save({})}
                  placeholder="Raça" className="bg-transparent border-b border-white/10 text-sm text-gray-300 outline-none focus:border-[#FF4500] w-32" data-testid="char-race" />
                <input value={c.class_name} onChange={(e) => setField("class_name", e.target.value)} onBlur={() => save({})}
                  placeholder="Classe" className="bg-transparent border-b border-white/10 text-sm text-gray-300 outline-none focus:border-[#FF4500] w-32" data-testid="char-class" />
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-gray-500 font-mono text-xs">NV</span>
                  <input type="number" min={1} value={c.level} onChange={(e) => setField("level", parseInt(e.target.value) || 1)} onBlur={() => save({})}
                    className="bg-transparent border-b border-white/10 font-mono w-12 outline-none focus:border-[#FF4500]" data-testid="char-level" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <button onClick={() => rest("short")} data-testid="rest-short-btn" className="border border-white/10 hover:border-[#FF4500] px-3 py-1 rounded-sm text-xs flex items-center gap-1"><Bed size={14} /> Descanso curto</button>
                <button onClick={() => rest("long")} data-testid="rest-long-btn" className="border border-white/10 hover:border-[#FF4500] px-3 py-1 rounded-sm text-xs flex items-center gap-1"><Bed size={14} weight="fill" /> Descanso longo</button>
                <button onClick={exportJson} data-testid="export-btn" className="border border-white/10 hover:border-white/30 px-3 py-1 rounded-sm text-xs flex items-center gap-1"><DownloadSimple size={14} /> Exportar JSON</button>
                <button onClick={importJson} data-testid="import-btn" className="border border-white/10 hover:border-white/30 px-3 py-1 rounded-sm text-xs flex items-center gap-1"><UploadSimple size={14} /> Importar</button>
                {saving && <span className="text-xs text-gray-500 font-mono">salvando...</span>}
              </div>
            </div>
            {/* Combat */}
            <div className="flex gap-4">
              <div className="border border-white/10 p-4 rounded-sm min-w-[100px] text-center">
                <Heart size={16} className="text-[#FF4500] mx-auto mb-1" weight="fill" />
                <div className="text-[10px] text-gray-500 font-mono mb-1">HP</div>
                <div className="flex items-center gap-1 justify-center">
                  <input type="number" value={c.hp_current} onChange={(e) => setField("hp_current", parseInt(e.target.value) || 0)} onBlur={() => save({})}
                    data-testid="hp-current" className="w-14 bg-transparent font-mono text-2xl font-bold text-center text-[#FF4500] outline-none" />
                  <span className="text-gray-500">/</span>
                  <input type="number" value={c.hp_max} onChange={(e) => setField("hp_max", parseInt(e.target.value) || 0)} onBlur={() => save({})}
                    data-testid="hp-max" className="w-14 bg-transparent font-mono text-lg text-center outline-none" />
                </div>
              </div>
              <div className="border border-white/10 p-4 rounded-sm min-w-[80px] text-center">
                <Shield size={16} className="text-gray-400 mx-auto mb-1" weight="fill" />
                <div className="text-[10px] text-gray-500 font-mono mb-1">CA</div>
                <input type="number" value={c.armor_class} onChange={(e) => setField("armor_class", parseInt(e.target.value) || 0)} onBlur={() => save({})}
                  data-testid="ac-input" className="w-14 bg-transparent font-mono text-2xl font-bold text-center outline-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="flex gap-1 border-b border-white/10 mb-6 overflow-x-auto scroll-thin">
              {[["stats","Atributos"],["skills","Perícias"],["spells","Magias"],["inventory","Inventário"],["combat","Combate"],["notes","História"]].map(([k, lbl]) => (
                <button key={k} onClick={() => setTab(k)} data-testid={`tab-${k}`}
                  className={`px-4 py-2 text-sm ${tab === k ? "border-b-2 border-[#FF4500] text-white" : "text-gray-500 hover:text-white"}`}>
                  {lbl}
                </button>
              ))}
            </div>

            {tab === "stats" && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(ATTR_LABELS).map(([k, lbl]) => {
                  const v = c.attributes?.[k] || 10;
                  const m = mod(v);
                  return (
                    <div key={k} className="border border-white/10 bg-[#12121A] p-4 rounded-sm text-center">
                      <div className="text-xs text-gray-500 font-mono mb-2">{lbl}</div>
                      <input type="number" value={v} onChange={(e) => setAttr(k, e.target.value)} onBlur={() => save({})}
                        data-testid={`attr-${k}`}
                        className="w-full bg-transparent font-mono text-4xl font-bold text-center outline-none focus:text-[#FF4500]" />
                      <div className="text-lg font-mono text-[#FF4500] mt-1">{m >= 0 ? `+${m}` : m}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {tab === "skills" && (
              <div>
                <button onClick={addSkill} data-testid="add-skill-btn" className="border border-white/10 hover:border-[#FF4500] px-3 py-1.5 rounded-sm text-sm flex items-center gap-1 mb-3"><Plus size={14} /> Adicionar perícia</button>
                <div className="space-y-2">
                  {(c.skills || []).map((s, i) => (
                    <div key={i} className="flex gap-2 items-center border border-white/10 p-2 rounded-sm">
                      <input value={s.name} onChange={(e) => updSkill(i, "name", e.target.value)} onBlur={() => save({})}
                        className="flex-1 bg-transparent outline-none focus:text-[#FF4500]" placeholder="Nome" data-testid={`skill-name-${i}`} />
                      <input type="number" value={s.value} onChange={(e) => updSkill(i, "value", e.target.value)} onBlur={() => save({})}
                        className="w-16 bg-[#0A0A0E] border border-white/10 rounded-sm px-2 py-1 font-mono text-center" placeholder="Valor" data-testid={`skill-value-${i}`} />
                      <input type="number" value={s.bonus} onChange={(e) => updSkill(i, "bonus", e.target.value)} onBlur={() => save({})}
                        className="w-16 bg-[#0A0A0E] border border-white/10 rounded-sm px-2 py-1 font-mono text-center" placeholder="Bônus" />
                      <button onClick={() => { delSkill(i); setTimeout(() => save({}), 100); }} data-testid={`del-skill-${i}`} className="p-1 text-gray-500 hover:text-red-400"><Trash size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "spells" && (
              <div>
                <div className="grid grid-cols-5 md:grid-cols-9 gap-2 mb-6">
                  {Object.entries(c.spell_slots || {}).map(([lvl, s]) => (
                    <div key={lvl} className="border border-white/10 p-2 rounded-sm text-center">
                      <div className="text-[10px] text-gray-500 font-mono">Nv {lvl}</div>
                      <div className="flex items-center gap-1 justify-center mt-1">
                        <input type="number" value={s.current} onChange={(e) => setSlot(lvl, "current", e.target.value)} onBlur={() => save({})}
                          data-testid={`slot-current-${lvl}`}
                          className="w-8 bg-transparent font-mono text-sm text-[#FF4500] text-center outline-none" />
                        <span className="text-gray-600">/</span>
                        <input type="number" value={s.max} onChange={(e) => setSlot(lvl, "max", e.target.value)} onBlur={() => save({})}
                          data-testid={`slot-max-${lvl}`}
                          className="w-8 bg-transparent font-mono text-sm text-center outline-none" />
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={addSpell} data-testid="add-spell-btn" className="border border-white/10 hover:border-[#FF4500] px-3 py-1.5 rounded-sm text-sm flex items-center gap-1 mb-3"><Sparkle size={14} /> Adicionar magia</button>
                <div className="space-y-2">
                  {(c.spells || []).map((sp, i) => (
                    <div key={i} className="border border-white/10 p-3 rounded-sm">
                      <div className="flex gap-2 items-center mb-2">
                        <input value={sp.name} onChange={(e) => updSpell(i, "name", e.target.value)} onBlur={() => save({})}
                          className="flex-1 bg-transparent font-medium outline-none focus:text-[#FF4500]" data-testid={`spell-name-${i}`} />
                        <select value={sp.level} onChange={(e) => updSpell(i, "level", parseInt(e.target.value))} onBlur={() => save({})}
                          className="bg-[#0A0A0E] border border-white/10 rounded-sm px-2 py-1 text-xs font-mono">
                          {[0,1,2,3,4,5,6,7,8,9].map((l) => <option key={l} value={l}>{l === 0 ? "Truque" : `Nv ${l}`}</option>)}
                        </select>
                        <label className="flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={sp.prepared} onChange={(e) => { updSpell(i, "prepared", e.target.checked); setTimeout(() => save({}), 100); }}
                            data-testid={`spell-prep-${i}`} />
                          Preparada
                        </label>
                        <button onClick={() => { delSpell(i); setTimeout(() => save({}), 100); }} className="p-1 text-gray-500 hover:text-red-400"><Trash size={14} /></button>
                      </div>
                      <textarea value={sp.description || ""} onChange={(e) => updSpell(i, "description", e.target.value)} onBlur={() => save({})}
                        placeholder="Descrição, componentes, alcance..."
                        className="w-full bg-[#0A0A0E] border border-white/10 rounded-sm px-2 py-1 text-sm" rows={2} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "inventory" && (
              <div>
                <div className="flex justify-between mb-3">
                  <button onClick={addItem} data-testid="add-item-btn" className="border border-white/10 hover:border-[#FF4500] px-3 py-1.5 rounded-sm text-sm flex items-center gap-1"><Plus size={14} /> Adicionar item</button>
                  <div className="text-sm font-mono text-gray-400">Peso total: <span className="text-[#FF4500]">{totalWeight.toFixed(1)}</span></div>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-5 gap-2 mb-4">
                  {["gp","sp","cp","pp","ep"].map((k) => (
                    <div key={k} className="border border-white/10 p-2 rounded-sm text-center">
                      <div className="text-[10px] text-gray-500 font-mono uppercase">{k}</div>
                      <input type="number" value={c.coins?.[k] || 0}
                        onChange={(e) => setC({ ...c, coins: { ...c.coins, [k]: parseInt(e.target.value) || 0 } })} onBlur={() => save({})}
                        data-testid={`coin-${k}`}
                        className="w-full bg-transparent font-mono text-lg text-center outline-none" />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {(c.inventory || []).map((it, i) => (
                    <div key={i} className="flex flex-wrap gap-2 items-center border border-white/10 p-2 rounded-sm">
                      <input value={it.name} onChange={(e) => updItem(i, "name", e.target.value)} onBlur={() => save({})}
                        className="flex-1 min-w-[120px] bg-transparent outline-none focus:text-[#FF4500]" data-testid={`item-name-${i}`} />
                      <select value={it.category} onChange={(e) => { updItem(i, "category", e.target.value); setTimeout(() => save({}), 100); }}
                        className="bg-[#0A0A0E] border border-white/10 rounded-sm px-2 py-1 text-xs">
                        <option value="weapon">Arma</option>
                        <option value="armor">Armadura</option>
                        <option value="consumable">Consumível</option>
                        <option value="magic">Mágico</option>
                        <option value="misc">Diverso</option>
                      </select>
                      <input type="number" value={it.qty} onChange={(e) => updItem(i, "qty", parseInt(e.target.value) || 1)} onBlur={() => save({})}
                        className="w-14 bg-[#0A0A0E] border border-white/10 rounded-sm px-2 py-1 font-mono text-center" placeholder="Qtd" />
                      <input type="number" step="0.1" value={it.weight} onChange={(e) => updItem(i, "weight", parseFloat(e.target.value) || 0)} onBlur={() => save({})}
                        className="w-16 bg-[#0A0A0E] border border-white/10 rounded-sm px-2 py-1 font-mono text-center" placeholder="Peso" />
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" checked={it.equipped} onChange={(e) => { updItem(i, "equipped", e.target.checked); setTimeout(() => save({}), 100); }} />
                        Equipado
                      </label>
                      <button onClick={() => { dupItem(i); setTimeout(() => save({}), 100); }} data-testid={`dup-item-${i}`} className="p-1 text-gray-500 hover:text-white"><Copy size={14} /></button>
                      <button onClick={() => { delItem(i); setTimeout(() => save({}), 100); }} className="p-1 text-gray-500 hover:text-red-400"><Trash size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "combat" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="border border-white/10 p-3 rounded-sm">
                    <div className="text-xs text-gray-500 font-mono mb-1">HP TEMPORÁRIO</div>
                    <input type="number" value={c.hp_temp} onChange={(e) => setField("hp_temp", parseInt(e.target.value) || 0)} onBlur={() => save({})}
                      data-testid="hp-temp" className="w-full bg-transparent font-mono text-3xl font-bold outline-none focus:text-[#FF4500]" />
                  </div>
                  <div className="border border-white/10 p-3 rounded-sm">
                    <div className="text-xs text-gray-500 font-mono mb-1">INICIATIVA</div>
                    <input type="number" value={c.initiative} onChange={(e) => setField("initiative", parseInt(e.target.value) || 0)} onBlur={() => save({})}
                      data-testid="init-input" className="w-full bg-transparent font-mono text-3xl font-bold outline-none focus:text-[#FF4500]" />
                  </div>
                </div>
                <div className="border border-white/10 p-4 rounded-sm">
                  <div className="text-xs text-gray-500 font-mono mb-2">CONDIÇÕES</div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(c.conditions || []).map((cd, i) => (
                      <span key={i} className="text-xs bg-[#FF4500]/10 border border-[#FF4500]/40 px-2 py-1 rounded-sm flex items-center gap-1">
                        {cd}
                        <button onClick={() => { setField("conditions", c.conditions.filter((_, x) => x !== i)); setTimeout(() => save({}), 100); }}>×</button>
                      </span>
                    ))}
                  </div>
                  <input placeholder="Adicionar condição e Enter" data-testid="cond-input"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.target.value.trim()) {
                        setField("conditions", [...(c.conditions || []), e.target.value.trim()]);
                        e.target.value = ""; setTimeout(() => save({}), 100);
                      }
                    }}
                    className="w-full bg-[#0A0A0E] border border-white/10 rounded-sm px-3 py-2 text-sm" />
                </div>
              </div>
            )}

            {tab === "notes" && (
              <div>
                <label className="block text-xs text-gray-500 font-mono mb-2">HISTÓRIA / BIOGRAFIA / PERSONALIDADE</label>
                <textarea value={c.background_text} onChange={(e) => setField("background_text", e.target.value)} onBlur={() => save({})}
                  data-testid="bg-textarea"
                  rows={12} className="w-full bg-[#12121A] border border-white/10 rounded-sm p-4 text-gray-300 focus:outline-none focus:border-[#FF4500]" />
              </div>
            )}
          </div>

          <div className="h-[600px] sticky top-24">
            <DiceRoller campaignId={c.campaign_id} characterId={c.id} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
