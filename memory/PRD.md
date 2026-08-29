# Grimório — Gestão de RPG (PRD)

## Problem statement (original, Portuguese)
Site completo de gestão de RPG personalizado, responsivo (desktop + celular), com autenticação (jogador/mestre), campanhas com convite, fichas (atributos/perícias/avatar/histórico), grimório (magias e espaços), inventário (categorias/peso/moedas/equipar), combate (HP/iniciativa/condições), rolagem de dados compartilhada, upload de arquivos por campanha, diário de sessão, NPCs/bestiário, modelos de ficha do mestre, biblioteca pública de sistemas, exportar/importar JSON, notificações.

## Architecture
- Backend: FastAPI single-file (`/app/backend/server.py`) + MongoDB (motor). UUID ids, ISO datetimes.
- Auth: JWT (bcrypt) via httpOnly cookies (SameSite=None, Secure) + Bearer fallback.
- Storage: Emergent Object Storage (INTEGRATION_PROXY_URL + EMERGENT_LLM_KEY).
- Frontend: React 19 + react-router v7 + Tailwind + shadcn/ui + Framer Motion + Phosphor Icons + sonner toasts.
- Theme: "Tactical Grimoire" — Cormorant Garamond (display), Outfit (body), JetBrains Mono (data); accent #FF4500 on obsidian #0A0A0E.

## Personas
- Mestre — cria campanhas, modelos de ficha, NPCs, diário; distribui convites.
- Jogador — entra em campanhas via código, cria/edita seus personagens.

## Implemented (2026-02-29 - v1 MVP)
- JWT auth (register/login/me/refresh/logout) with cookie sessions + admin seed.
- Campaigns CRUD + 6-digit invite code + join endpoint + master notifications on template updates.
- Characters: CRUD, duplicate, long/short rest, export/import JSON, history log.
- Character sheet UI (Bento layout) with tabs: Atributos, Perícias, Magias (espaços por nível 1–9), Inventário (moedas GP/SP/CP/PP/EP, categorias, peso, equipar, duplicar), Combate (HP/HP-temp/iniciativa/condições), História.
- Dice roller: expression parser (1d20+5 style), shared per-campaign feed with 3s polling and crit/fumble highlighting.
- File uploads via Object Storage; per-campaign gallery (images + PDFs), soft-delete.
- Session notes (mestre only), NPC/bestiário, party & members overview.
- Templates: private/public library, install (clone) endpoint, editor for attributes & skills schemas.
- Notifications feed (bell in header) with unread badge + read-all.
- Landing page with hero, feature grid, sample character sheet.

## Backlog (P0)
- Combat encounter tracker (multiple actors, turn order).
- Loot distribution flow (mestre → jogadores).

## Backlog (P1)
- Métricas dashboard com gráficos (recharts) — dano total, XP, comparação entre personagens.
- Comparativo lado a lado de personagens.
- Exportar ficha em PDF.
- Histórico detalhado de alterações da ficha (diff visual).
- WebSocket para rolagens instantâneas (hoje é polling).

## Backlog (P2)
- Suporte a fórmulas automáticas configuráveis no modelo (proficiência, CA por armadura).
- Marketplace de modelos com busca/filtros por sistema.
- Player permissions granulares no template.
