import { Link } from "react-router-dom";

export default function PublicGuide({ page }) {
  return <div className="min-h-screen bg-[#101416] text-white">
    <nav className="max-w-5xl mx-auto px-6 py-6 flex flex-wrap justify-between gap-4" aria-label="Navegação principal">
      <Link to="/" className="font-display text-2xl text-[#D5AB68]">✦ Grimoorio</Link>
      <div className="flex gap-6 items-center"><Link to="/login">Entrar</Link><Link to="/register" className="text-[#D5AB68]">Criar conta</Link></div>
    </nav>
    <main className="max-w-5xl mx-auto px-6 pt-12 pb-20">
      <article>
        <Link to="/" className="text-sm text-gray-400">Início</Link>
        <h1 className="font-display text-4xl md:text-6xl mt-6 mb-8">{page.heading}</h1>
        <p className="text-lg text-gray-300 leading-relaxed max-w-3xl">{page.intro}</p>
        <div className="grid md:grid-cols-3 gap-6 my-12">{page.sections.map(section =>
          <section key={section.title} className="journal-panel p-6"><h2 className="font-display text-2xl text-[#D5AB68] mb-4">{section.title}</h2><p className="text-gray-300 leading-relaxed">{section.text}</p></section>
        )}</div>
        <section className="my-12"><h2 className="font-display text-3xl mb-6">Como começar no Grimoorio</h2><ol className="list-decimal pl-6 space-y-3 text-gray-300">{page.steps.map(step => <li key={step}>{step}</li>)}</ol></section>
        <section className="my-12"><h2 className="font-display text-3xl mb-6">Perguntas frequentes</h2><div className="space-y-6">{page.questions.map(item => <section key={item.question}><h3 className="font-display text-2xl mb-2">{item.question}</h3><p className="text-gray-300 leading-relaxed">{item.answer}</p></section>)}</div></section>
        <div className="flex flex-wrap items-center gap-6"><Link to="/register" className="bg-[#D5AB68] text-[#101416] px-6 py-3 rounded-sm">Criar minha conta</Link><Link to={page.related} className="text-[#D5AB68] underline">{page.relatedLabel}</Link></div>
      </article>
    </main>
    <footer className="border-t border-white/10 px-6 py-8 text-gray-400 text-center"><Link to="/">Grimoorio — fichas e campanhas de RPG</Link></footer>
  </div>;
}
