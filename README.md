# Grimoorio
Gerenciador de campanhas e fichas de RPG: React 18, FastAPI, MongoDB e Cloudflare R2.

## Executar localmente
Requisitos: Node 22.12+, Python 3.11 e MongoDB local ou banco de desenvolvimento.
Nunca use o banco de produção para testes.

Backend (na pasta backend):
1. Crie um ambiente virtual: python -m venv .venv
2. Ative-o e instale: pip install -r requirements-dev.txt
3. Copie .env.example para .env e configure MONGO_URL, DB_NAME e JWT_SECRET.
4. Inicie: python -m uvicorn server:app --reload --port 8000

Frontend (na pasta frontend):
1. Copie .env.example para .env.
2. Execute npm ci e npm start.
3. Abra http://localhost:3000.

## Testes isolados
No backend: python -m pytest tests/test_security_local.py -q
Esses testes usam banco simulado e não acessam Render ou R2.
Os testes antigos fazem chamadas HTTP e criam dados: use somente ambiente de testes.
No frontend: npm run build.

## Login com Google
Crie um cliente OAuth do tipo Aplicativo Web no Google Cloud e configure a tela de consentimento.
No backend, configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI.
Local: http://localhost:8000/api/auth/google/callback
Produção: https://grimoorio-backend.onrender.com/api/auth/google/callback
Cadastre o endereço exato no cliente OAuth. Se usar domínio próprio na API, atualize ambos.
Configure FRONTEND_URL para o endereço do frontend. O botão só aparece quando as três variáveis Google estão preenchidas.
Em modo de testes do Google, adicione os emails dos usuários de teste.
O fluxo usa state, nonce, PKCE e verificação de assinatura do ID token no servidor.
Contas existentes com senha não são vinculadas automaticamente por email: entre com sua senha.
Novas contas Google recebem o papel escolhido no cadastro, ou Jogador ao entrar pela tela de login.
Não cole o segredo Google no frontend ou no repositório.

## Produção / Render
Veja RENDER_DEPLOYMENT.md. Nenhuma publicação é feita pelos scripts locais.
As configurações de cookies locais e de produção são diferentes.
Modelos iniciais são pontos de partida editáveis, não implementações completas de regras de D&D ou Tormenta.

O frontend usa Vite e mantém a pasta de saída build. REACT_APP_BACKEND_URL continua aceito para compatibilidade; VITE_API_URL tem preferência.

## Experimentar sem chaves
Neste computador, abra INICIAR_TESTE.cmd para iniciar uma demonstração isolada em http://localhost:4173.
Use mestre@exemplo.com ou jogador@exemplo.com, com a senha fictícia GrimoorioTeste123!.
MongoDB e uploads ficam somente na memória. Nada é enviado ao Render ou R2.
Os dados desaparecem ao fechar a janela. O Google fica desativado nessa demonstração.
Em outro computador, instale requirements-dev.txt no ambiente virtual backend/.venv e compile o frontend primeiro.
Para repetir a verificação de navegador com Chrome instalado, mantenha a demonstração aberta e execute:
backend/.venv/Scripts/python.exe tools/browser_qa.py

## Capas e retratos
- Campanhas: selecione a capa na criação ou troque-a na página da campanha. Somente o mestre altera.
- Sistemas e modelos: selecione a capa na criação ou no editor. Somente o autor altera.
- NPCs e monstros: selecione a foto na criação ou no card do bestiário. Somente o mestre altera.
- PNG, JPEG, WebP e GIF de até 10 MB. É possível trocar ou remover as imagens.
- As fotos usam a integração existente com Cloudflare R2 e metadados no MongoDB.
- O acesso segue as permissões da campanha/modelo. As imagens não se tornam anexos públicos.
- A instalação de um modelo mantém uma referência independente à capa, mesmo se a original mudar.
- Na demonstração, banco e arquivos ficam em memória e desaparecem ao encerrar.
- Registros antigos sem foto continuam funcionando, sem migração obrigatória.

Testes de imagens no Chrome:
1. Execute backend/.venv/Scripts/python.exe tools/local_demo.py --no-browser --api-port 8174 --web-port 4174
2. Em outro terminal execute backend/.venv/Scripts/python.exe tools/media_browser_qa.py
