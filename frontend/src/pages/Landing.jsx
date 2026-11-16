import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, Shield, Sparkle, Users, Scroll, Sword, DiceSix, Books } from "@phosphor-icons/react";

const features = [
  { icon: Shield, title: "Personagens com história", text: "Atributos, perícias, inventário e magias. Tudo o que seu personagem carrega, sem folhas perdidas." },
  { icon: Users, title: "Uma mesa, um universo", text: "Convide seu grupo, organize sessões, compartilhe arquivos e mantenha a campanha sempre por perto." },
  { icon: Books, title: "As regras são suas", text: "Comece com um modelo ou crie seu sistema. Campos e seções para histórias que não cabem em uma ficha comum." },
  { icon: DiceSix, title: "Deixe o destino decidir", text: "Role os dados com seu grupo e acompanhe os resultados da aventura em um único lugar." },
];
export default function Landing() {
  const { user } = useAuth();
  if (user) return <Navigate to="/app" replace />;
  return <div className="min-h-screen bg-[#101416] text-white overflow-hidden">
    <nav className="max-w-7xl mx-auto px-6 md:px-12 py-6 flex justify-between items-center gap-4" aria-label="Navegação principal">
      <Link to="/" className="font-display text-2xl md:text-3xl font-semibold whitespace-nowrap"><span className="brand-rune" aria-hidden="true">✦</span> Grimoorio</Link>
      <div className="flex items-center gap-3 md:gap-6">

        <Link to="/login" data-testid="landing-login-btn" className="text-sm text-gray-300">Entrar</Link>
        <Link to="/register" data-testid="landing-signup-btn" className="border border-[#D5AB68]/50 text-[#D5AB68] rounded-sm px-4 py-2 text-sm">Criar conta</Link>
      </div>
    </nav>
    <main>
      <section className="landing-hero max-w-7xl mx-auto px-6 md:px-12 pt-14 md:pt-24 pb-16 md:pb-24">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center relative z-10">
          <div className="lg:col-span-7">
            <p className="journal-label mb-6 flex items-center gap-3"><span className="w-7 h-px bg-[#D5AB68]" /> O próximo capítulo começa aqui</p>
            <h1 className="font-display hero-title">Grandes histórias.<br /><em>Uma só mesa.</em></h1>
            <p className="text-gray-400 text-lg md:text-xl max-w-lg leading-relaxed mt-7">Seu universo de RPG merece um lugar à altura. Reúna a mesa, dê vida aos personagens e guarde cada capítulo da aventura.</p>
            <div className="flex flex-wrap gap-4 mt-9">
              <Link to="/register" data-testid="hero-cta" className="bg-[#D5AB68] hover:bg-[#E5C38D] text-[#101416] px-6 py-3.5 rounded-sm inline-flex items-center gap-3 font-medium">Começar minha história <ArrowRight size={18} /></Link>
              <a href="#recursos" className="text-gray-300 px-2 py-3.5 inline-flex gap-2 items-center">Explorar o grimório <span aria-hidden="true">↓</span></a>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-400 mt-9"><span>D&D 5e</span><span className="text-[#D5AB68]" aria-hidden="true">✦</span><span>Tormenta20</span><span className="text-[#D5AB68]" aria-hidden="true">✦</span><span>Seu próprio sistema</span></div>
          </div>
          <div className="lg:col-span-5 relative" aria-label="Exemplo de ficha de personagem">
            <div className="journal-panel p-6 md:p-8 relative shadow-2xl">
              <div className="flex justify-between items-center border-b border-[#D5AB68]/20 pb-5"><span className="journal-label">Diário de personagem</span><Sparkle size={22} className="text-[#D5AB68]" /></div>
              <div className="flex gap-4 items-center mt-7 mb-7"><div className="w-16 h-20 rounded-t-full border border-[#D5AB68]/30 bg-[#D5AB68]/5 flex items-center justify-center"><Sword size={34} weight="duotone" className="text-[#D5AB68]" /></div><div><p className="text-xs text-gray-400 mb-1">AS CRÔNICAS DO CREPÚSCULO</p><h2 className="font-display text-4xl">Kaelith</h2><p className="text-sm text-gray-400 mt-1">Elfo · Ranger · Nível 5</p></div></div>
              <div className="grid grid-cols-3 gap-2">{[["FOR","14","+2"],["DES","18","+4"],["CON","13","+1"],["INT","10","+0"],["SAB","16","+3"],["CAR","8","−1"]].map(([label,value,bonus]) => <div key={label} className="border border-white/10 rounded-sm p-3 text-center"><div className="text-[10px] tracking-widest text-gray-400">{label}</div><div className="font-display text-3xl my-1">{value}</div><div className="text-xs text-[#D5AB68]">{bonus}</div></div>)}</div>
              <div className="flex items-center gap-5 mt-6"><div className="flex-1"><div className="flex justify-between text-xs mb-2"><span className="text-gray-400">Pontos de vida</span><span>38 <span className="text-gray-400">/ 45</span></span></div><div className="h-1.5 bg-white/10 rounded-full"><div className="w-[84%] h-full bg-[#83A58F] rounded-full" /></div></div><div className="border-l border-white/10 pl-5"><span className="text-xs text-gray-400">Defesa</span><div className="font-display text-2xl">16</div></div></div>
              <div className="mt-6 pt-5 border-t border-white/10 text-sm text-gray-400 italic font-display text-xl">“Algumas trilhas só aparecem quando você decide caminhar.”</div>
            </div>
            <div className="mt-3 text-right text-xs text-gray-400">Uma prévia do que sua próxima aventura pode ser.</div>
          </div>
        </div>
      </section>
      <section id="recursos" className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-xl mb-10"><p className="journal-label mb-3">Menos preparação. Mais aventura.</p><h2 className="font-display text-4xl md:text-5xl">Tudo ao alcance<br />de uma rolagem.</h2></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{features.map(({icon:Icon,title,text},i) => <article key={title} className="journal-panel p-6"><div className="flex justify-between items-center mb-7"><Icon size={28} weight="duotone" className="text-[#D5AB68]" /><span className="feature-number">0{i+1}</span></div><h3 className="font-display text-2xl mb-3">{title}</h3><p className="text-sm text-gray-400 leading-relaxed">{text}</p></article>)}</div>
      </section>
      <section className="max-w-7xl mx-auto px-6 md:px-12 pb-20"><div className="journal-panel p-8 md:p-12 flex flex-wrap items-center justify-between gap-6"><div><p className="journal-label mb-3">Seu grupo tem uma história para contar</p><h2 className="font-display text-3xl md:text-4xl">Abra seu grimório.</h2></div><Link to="/register" className="bg-[#D5AB68] text-[#101416] px-6 py-3 rounded-sm flex items-center gap-3">Criar minha conta <ArrowRight size={18} /></Link></div></section>
    </main>
    <footer className="border-t border-white/10 px-6 py-8"><div className="max-w-6xl mx-auto flex flex-wrap justify-between gap-4 text-sm text-gray-400"><span className="font-display text-xl">✦ Grimoorio</span><span>Feito para mestres exigentes e jogadores curiosos.</span></div></footer>
  </div>;
}
