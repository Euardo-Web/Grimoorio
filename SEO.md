# SEO do Grimoorio

O build do frontend gera HTML com conteúdo para estas páginas públicas:
- https://grimoorio.com.br/
- https://grimoorio.com.br/fichas-de-rpg
- https://grimoorio.com.br/campanhas-de-rpg

O sitemap.xml é gerado da mesma lista de páginas em frontend/src/seo/pages.js.
O robots.txt anuncia o sitemap e mantém /app fora do rastreamento.
O HTML público usa os mesmos componentes React da interface; não carrega contas,
campanhas ou fichas de usuários durante a geração.

## Validar antes de publicar

Na pasta frontend:
1. npm ci
2. npm run build
3. npm run test:seo
4. npm run preview

Confira os guias, os links de cadastro e a navegação de volta à página inicial.
Confira o código-fonte das três páginas: título, descrição, canonical e conteúdo
devem estar presentes sem executar JavaScript.
O app-shell.html mantém o aplicativo sem conteúdo público e com noindex.

## Render

A publicação continua usando a pasta frontend/build.
Sincronize as regras do render.yaml com o serviço estático:
- /fichas-de-rpg -> /fichas-de-rpg/index.html (rewrite)
- /campanhas-de-rpg -> /campanhas-de-rpg/index.html (rewrite)
- /* -> /app-shell.html (rewrite, última regra)

Arquivos existentes são servidos pelo Render antes de aplicar rewrites.
Se o serviço foi criado manualmente, editar render.yaml não atualiza
automaticamente o painel: aplique as regras acima no serviço existente.
Não adicione noindex global no cabeçalho HTTP, pois as páginas públicas
precisam continuar indexáveis.

## Search Console depois da publicação

Já existe um arquivo de verificação Google em frontend/public.
Isso não comprova que a propriedade está configurada ou acessível.
Com a conta proprietária no Search Console:
1. Confirme a propriedade https://grimoorio.com.br/ ou a propriedade de domínio.
2. Envie https://grimoorio.com.br/sitemap.xml.
3. Inspecione as três URLs e execute o teste ao vivo.
4. Confira se o HTML renderizado contém o texto e se a indexação é permitida.
5. Solicite indexação e acompanhe páginas indexadas, impressões e cliques.

A criação de conteúdo deve continuar baseada nas dúvidas reais de mestres e
jogadores. As páginas novas descrevem os recursos existentes e não prometem
automação completa de regras de sistemas específicos.

Nenhuma alteração técnica garante posição ou prazo de indexação.
Referências:
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://render.com/docs/redirects-rewrites
