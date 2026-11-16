import { Link } from "react-router-dom";
import { ArrowUpRight, Users } from "@phosphor-icons/react";
import { ResourceImage } from "@/components/ResourceImage";
export default function CampaignCard({ campaign: c, compact = false, testId }) {
  return <Link to={`/app/campaigns/${c.id}`} className={`campaign-card ${compact ? "campaign-card-compact" : ""}`} data-testid={testId || `campaign-${c.id}`}>
    <ResourceImage assetId={c.cover_file_id} alt={`Capa de ${c.name}`} initials={c.name?.slice(0,1) || "✦"} className="campaign-card-cover" />
    <div className="campaign-card-body">
      <div className="flex justify-between gap-2 items-center"><span className="journal-label">{c.system}</span><ArrowUpRight size={18} className="text-[#D5AB68]" /></div>
      <h2 className="font-display text-2xl mt-2 mb-2">{c.name}</h2>
      {!compact && <p className="text-sm text-gray-400 line-clamp-2">{c.description || "Uma nova história espera pela sua mesa."}</p>}
      <div className="campaign-card-footer"><span className="inline-flex items-center gap-1"><Users size={14} />{c.is_master ? "Mestre" : "Jogador"}</span><span>#{c.invite_code}</span></div>
    </div>
  </Link>;
}
