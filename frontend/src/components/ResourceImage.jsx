import { useEffect, useRef, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { ImageSquare, UploadSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

export async function uploadResourceImage(kind, id, file) {
  if (!["image/png","image/jpeg","image/webp","image/gif"].includes(file.type)) throw new Error("Escolha PNG, JPEG, WebP ou GIF.");
  if (file.size > 10 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 10 MB.");
  const data = new FormData(); data.append("file", file);
  return (await api.post(`/images/${kind}/${id}`, data)).data;
}
export async function removeResourceImage(kind, id) {
  return (await api.delete(`/images/${kind}/${id}`)).data;
}
export function ResourceImage({ assetId, file, alt = "", className = "", initials = "✦", legacyUrl }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    setUrl(""); setFailed(false);
    if (file) {
      objectUrl = URL.createObjectURL(file); setUrl(objectUrl);
    } else if (assetId) {
      api.get(`/files/${assetId}/download`, { responseType: "blob", signal: controller.signal })
        .then(({ data }) => { if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(data); setUrl(objectUrl); } })
        .catch((error) => { if (error.code !== "ERR_CANCELED") setFailed(true); });
    } else if (legacyUrl) setUrl(legacyUrl);
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [assetId, file, legacyUrl]);
  return <div className={`resource-image ${className}`}>
    {url && !failed ? <img src={url} alt={alt} onError={() => setFailed(true)} loading="lazy" />
      : <div className="image-placeholder" role={alt ? "img" : undefined} aria-label={alt || undefined}>
          <span className="image-placeholder-orbit" aria-hidden="true" /><span className="image-monogram" aria-hidden="true">{initials}</span>
        </div>}
  </div>;
}
export function ImagePicker({ label, file, assetId, onSelect, onRemove, disabled = false, compact = false }) {
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const perform = async (action) => {
    setBusy(true);
    try { await action(); }
    catch (error) { toast.error(formatApiError(error)); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  };
  return <div className={`image-picker ${compact ? "image-picker-compact" : ""}`}>
    <ResourceImage file={file} assetId={assetId} className="image-picker-preview" initials={<ImageSquare size={28} />} />
    <div className="min-w-0">
      <p className="text-sm text-gray-300 mb-1">{label}</p>
      <p className="text-xs text-gray-400 mb-3">PNG, JPEG, WebP ou GIF · até 10 MB</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={disabled || busy} onClick={() => input.current?.click()} className="image-action">
          <UploadSimple size={15} />{busy ? "Salvando imagem…" : assetId || file ? "Trocar imagem" : "Adicionar imagem"}
        </button>
        {(assetId || file) && onRemove && <button type="button" disabled={disabled || busy} aria-label={`Remover ${label.toLowerCase()}`} onClick={() => perform(onRemove)} className="image-action text-red-300"><Trash size={15} /> Remover</button>}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label={label}
        className="sr-only" disabled={disabled || busy} onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) perform(() => {
            if (!["image/png","image/jpeg","image/webp","image/gif"].includes(selected.type) || selected.size > 10485760) throw new Error("Escolha uma imagem válida de até 10 MB.");
            return onSelect(selected);
          });
        }} />
    </div>
  </div>;
}
