export const SITE_URL = "https://grimoorio.com.br";
export const pages = [
  {
    path: "/",
    title: "Fichas de RPG online e campanhas | Grimoorio",
    description: "Crie fichas de personagens, personalize modelos e organize campanhas de RPG online. Reúna seu grupo e acompanhe suas aventuras no Grimoorio.",
  },
  {
    path: "/fichas-de-rpg",
    title: "Criador de fichas de RPG online | Grimoorio",
    description: "Organize atributos, perícias, inventário e magias em fichas de RPG online. Saiba como começar com um modelo ou personalizar seu próprio sistema.",
    heading: "Crie e organize suas fichas de RPG online",
    intro: "Uma ficha de personagem reúne as informações usadas durante a aventura: atributos, perícias, pontos de vida, equipamentos e habilidades. No Grimoorio, você mantém esses dados em uma ficha digital e pode adaptar o modelo à sua mesa.",
    sections: [
      { title: "Comece pelo modelo da sua mesa", text: "Antes de criar o personagem, escolha um modelo compatível com as regras do grupo. O Grimoorio permite trabalhar com modelos e personalizar campos e seções. Combine com o mestre quais informações devem fazer parte da ficha, principalmente quando a mesa usa regras próprias." },
      { title: "Separe atributos, inventário e magias", text: "Agrupe as informações pelo uso durante a sessão. Deixe atributos e perícias fáceis de consultar, registre os itens do inventário e mantenha habilidades e magias em seções próprias. Isso ajuda a encontrar uma informação sem interromper a história." },
      { title: "Atualize a ficha entre as sessões", text: "Depois de uma aventura, revise os recursos consumidos, os itens encontrados e as mudanças do personagem. Use a ficha como um registro contínuo da jornada, em vez de reconstruir as informações a cada encontro." },
    ],
    steps: ["Crie sua conta ou entre no Grimoorio.", "Acesse a área de modelos e escolha ou personalize a estrutura da ficha.", "Crie seu personagem e preencha as informações combinadas com a mesa.", "Atualize a ficha conforme a campanha avança."],
    questions: [
      { question: "Posso usar um sistema próprio de RPG?", answer: "Você pode criar modelos com campos e seções personalizados. A estrutura e as regras necessárias para seu sistema devem ser configuradas conforme a sua mesa." },
      { question: "Preciso entrar para criar uma ficha?", answer: "Sim. As fichas e os personagens ficam na área do aplicativo, acessada com uma conta. Esta página explica como começar sem exigir login." },
    ],
    related: "/campanhas-de-rpg",
    relatedLabel: "Veja também como organizar campanhas de RPG",
  },
  {
    path: "/campanhas-de-rpg",
    title: "Gerenciador de campanhas de RPG online | Grimoorio",
    description: "Organize suas campanhas de RPG, convide jogadores e mantenha personagens, sessões e arquivos da mesa em um só lugar no Grimoorio.",
    heading: "Organize sua campanha de RPG com o grupo",
    intro: "Uma campanha conecta personagens e aventuras ao longo de várias sessões. O Grimoorio oferece um espaço para reunir o grupo, organizar sessões e manter os materiais da mesa por perto.",
    sections: [
      { title: "Defina a campanha antes da primeira aventura", text: "Combine o sistema, a proposta da história e a frequência dos encontros. Escolha um modelo de ficha que represente as regras da mesa. Ter essas decisões registradas ajuda os jogadores a preparar personagens que façam sentido para a aventura." },
      { title: "Reúna jogadores e personagens", text: "Crie a campanha e use o convite para reunir os participantes. Organize os personagens da mesa para que as informações da aventura não fiquem espalhadas entre conversas e documentos. Antes de compartilhar um material, confira com quem ele deve ser dividido." },
      { title: "Mantenha sessões e materiais organizados", text: "Prepare o próximo encontro com as informações que o grupo precisa consultar. Organize sessões e compartilhe arquivos da campanha. Depois da partida, revise com os jogadores os acontecimentos e os próximos passos da história." },
    ],
    steps: ["Entre no Grimoorio e acesse a área de campanhas.", "Crie a campanha e escolha o modelo usado pela mesa.", "Convide o grupo para participar.", "Organize personagens, sessões e arquivos ao longo da aventura."],
    questions: [
      { question: "O Grimoorio serve para mestres e jogadores?", answer: "Sim. A plataforma reúne recursos para preparar campanhas e acompanhar personagens. Combine com o grupo quem será responsável pela organização da mesa." },
      { question: "Minhas campanhas aparecem nesta página pública?", answer: "Não. Esta é uma apresentação dos recursos. As campanhas e fichas continuam na área do aplicativo, com acesso pela conta e pelas permissões da mesa." },
    ],
    related: "/fichas-de-rpg",
    relatedLabel: "Veja também como organizar fichas de RPG online",
  },
];
export function pageForPath(pathname) {
  return pages.find(page => page.path === (pathname.replace(/\/$/, "") || "/"));
}
