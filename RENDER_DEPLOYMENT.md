# Publicar no Render
Mantenha o backend existente e o banco. Teste primeiro em um serviço e banco de homologação.

## Backend
- Pasta: backend
- Python: 3.11
- Build: pip install -r requirements.txt
- Start: python -m uvicorn server:app --host 0.0.0.0 --port $PORT
- Health check: /api/
- Variáveis: MONGO_URL, DB_NAME, JWT_SECRET (mínimo 32 caracteres), APP_ENV=production,
  FRONTEND_URL=https://grimoorio.com.br, COOKIE_SECURE=true, COOKIE_SAMESITE=none.
- CORS_ORIGINS: lista separada por vírgulas das origens autorizadas, sem barra final.
- R2: configure as quatro variáveis R2 da referência .env.example.
- Google opcional: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI.
- ADMIN_EMAIL e ADMIN_PASSWORD são opcionais; nenhuma conta padrão será criada.
  Contas antigas já existentes precisam ter suas credenciais alteradas ou ser removidas separadamente.

O startup cria índices únicos de email, google_sub e curtidas. Se houver duplicatas antigas,
o índice pode falhar. Revise e resolva duplicatas no banco de homologação antes de publicar.
A limitação por IP usa request.client; configure o proxy confiável do Uvicorn conforme a infraestrutura,
sem confiar indiscriminadamente em cabeçalhos enviados por clientes.

## Frontend
- Pasta: frontend
- Build: npm ci && npm run build
- Pasta publicada: build
- REACT_APP_BACKEND_URL=https://grimoorio-backend.onrender.com
- Rewrite /* para /index.html (já presente em render.yaml).
- O render.yaml configura somente o frontend; o backend existente continua configurado no painel.

## Cookies e domínio da API
Frontend em grimoorio.com.br e backend em onrender.com usam cookies de terceiros.
Alguns navegadores bloqueiam esse cenário, mesmo com SameSite=None.
Para melhor compatibilidade, configure api.grimoorio.com.br no backend, atualize a URL do frontend
e o callback Google no Render e no Google Cloud. Depois reconstrua o frontend.
Localmente use APP_ENV=development, COOKIE_SECURE=false e COOKIE_SAMESITE=lax.

## Verificação
1. Rode os testes isolados do backend e o build do frontend.
2. Faça login por senha e por Google em homologação.
3. Teste criação de campanha, ficha, modelo, upload e acesso com outro usuário.
4. Confira o visual no celular e a restauração de sessões.
5. Publique somente após revisar o resultado local.

O frontend usa Vite e mantém a pasta de saída build. REACT_APP_BACKEND_URL continua aceito para compatibilidade; VITE_API_URL tem preferência.

## Atualização com capas e retratos
A arquitetura permanece a mesma: frontend estático + backend Python + MongoDB + Cloudflare R2.
Publique frontend e backend juntos. O script tools/local_demo.py é exclusivo de teste local.

| Serviço | Pasta | Build | Inicialização / publicação |
| --- | --- | --- | --- |
| Frontend estático | frontend | npm ci && npm run build | pasta build |
| Backend Python 3.11 | backend | pip install -r requirements.txt | python -m uvicorn server:app --host 0.0.0.0 --port $PORT |

Mantenha as variáveis MONGO_URL, DB_NAME e R2 existentes.
O frontend mantém suporte a REACT_APP_BACKEND_URL; VITE_API_URL tem preferência se ambas existirem.
JWT_SECRET deve ter pelo menos 32 caracteres. Use Node 24 no build do frontend.
Os novos campos de imagem são opcionais; não é necessário apagar/recriar o banco.
Os uploads são salvos no R2, não no disco temporário do Render.
Confira R2_BUCKET_NAME, R2_ENDPOINT_URL, R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY no backend.
Não use as configurações de cookies de desenvolvimento na produção.
Limites de imagem: PNG, JPEG, WebP ou GIF até 10 MB.
As credenciais continuam nas variáveis do Render, nunca no código ou no chat.

Referências: https://render.com/docs/blueprint-spec e https://render.com/docs/deploy-fastapi
