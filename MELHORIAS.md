# Melhorias do Grimoorio — 16/11/2026

## O que mudou
- Nova página inicial, paleta escura com dourado/cobre, navegação, cartões e formulários.
- Ajustes de layout para celular, foco de teclado, labels e preferência por movimento reduzido.
- Editor de modelos com prévia, atributos, perícias e seções de texto, número e marcação.
- Três modelos iniciais editáveis. Campos personalizados são salvos e exportados com as fichas.
- Fila de salvamento da ficha com estado atualizado para evitar valores antigos em ações rápidas.
- Renovação automática da sessão e revogação dos tokens apresentados no logout.
- Permissões corrigidas para arquivos pessoais, campanhas e associação de modelos privados.
- Upload limitado a 10 MB, lista de tipos, checagem inicial de assinatura e downloads privados.
- Limites para JSON e expressões de dados; limitação de tentativas em endpoints sensíveis.
- Validação de origem em alterações feitas pelo navegador e cabeçalhos de segurança.
- Conta administrativa padrão removida. Contas antigas não são apagadas automaticamente.
- Login Google via autorização no servidor, PKCE, state, nonce e validação do ID token.
- Não há vínculo automático com contas de senha que já usam o mesmo email.
- Migração de CRA/CRACO para Vite; bibliotecas sem uso e rastreamento gerado removidos.
- Dependências do backend atualizadas e travadas; package-lock.json adicionado.
- Configuração Render, metadados, idioma e documentação revisados.
- Demonstração local em memória: INICIAR_TESTE.cmd.

## Validação realizada
- 36 testes isolados do backend passaram após atualizar as dependências.
- 11 verificações em Chrome passaram, usando apenas servidor e banco locais:
  início desktop/celular, login, painel, menu móvel, biblioteca de modelos,
  prévia e edição, persistência da ficha, renovação de sessão e campanha.
- Verificado layout em 1440px e 390px; sem overflow horizontal nos cenários testados.
- Nenhum erro JavaScript nos fluxos verificados.
- Build de produção Vite concluído.
- npm audit: zero vulnerabilidades conhecidas na consulta realizada.
- pip-audit das dependências travadas: zero vulnerabilidades conhecidas na consulta realizada.
- Imagens e resultado do navegador estão em artifacts/.

## Como experimentar
1. Abra INICIAR_TESTE.cmd.
2. Acesse http://localhost:4173 se o navegador não abrir sozinho.
3. Use mestre@exemplo.com ou jogador@exemplo.com.
4. Senha fictícia de ambas as contas: GrimoorioTeste123!
5. Encerre com Ctrl+C. Os dados de teste são descartados.

A demonstração não utiliza MongoDB, R2 nem credenciais reais. É acessível somente neste computador.
O Google fica desligado nela. Para testar esse provedor, configure um ambiente de desenvolvimento
com um banco próprio e um cliente OAuth, conforme README.md.

## O que ainda depende da sua configuração
- Login Google real: criar cliente OAuth Web e configurar GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI no backend; não enviar os segredos no chat.
- Integração real com MongoDB e R2: validar em homologação com variáveis locais.
- Antes do deploy: revisar contas antigas, tamanho do JWT_SECRET e eventuais duplicatas
  nos índices únicos novos. Veja RENDER_DEPLOYMENT.md.
- Cookies entre domínio próprio e onrender.com podem ser bloqueados pelo navegador;
  a documentação descreve a configuração recomendada com api.grimoorio.com.br.
- Os modelos iniciais não automatizam todas as regras dos sistemas citados.

As auditorias de dependências não garantem ausência de falhas de lógica.
Não houve publicação no Render, push no GitHub nem alteração dos dados de produção.

## Complemento — capas de campanhas/modelos e retratos
- Campanhas em cards horizontais com capas; o painel inicial usa o mesmo componente.
- Sistemas/modelos em cards verticais, com capas também na biblioteca pública e na prévia.
- Capas selecionáveis durante a criação ou posteriormente, com troca e remoção.
- NPCs e monstros com retratos selecionáveis na criação e nos cards do bestiário.
- Imagens com acesso vinculado à campanha/modelo e controle de quem pode alterar.
- Modelos instalados mantêm sua capa independentemente de alterações na origem.
- Imagens seguem os limites existentes de upload e a integração R2/MongoDB.
- Dados antigos sem foto permanecem compatíveis. Não foi feita alteração em produção.

Validação desta atualização: 43 testes de backend passaram; 12 verificações de imagens
passaram no Chrome, em desktop e celular, sem erro JavaScript. Build Vite concluído.
Capturas novas estão em artifacts/09-* até artifacts/14-*.
Veja RENDER_DEPLOYMENT.md para publicar os dois serviços com a estrutura existente.

## Publicação — remoção dos apoios
Removidos os links de apoio do menu lateral, navegação da página inicial e rodapé.
