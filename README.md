# HubGym – Painel Administrativo (MVP)

Base inicial para a área administrativa usada pelo papel **ADMIN** na plataforma de gestão de personal trainers e alunos.

## Stack adotada
- **Backend:** Node.js + TypeScript com **Express** (opção escolhida para manter o MVP simples; fácil migrar para NestJS depois).
- **ORM:** Prisma + PostgreSQL.
- **Auth:** JWT com roles (`ADMIN`, `PERSONAL`, `ATHLETE`).
- **Frontend admin:** React + Vite + TypeScript e **Chakra UI**.

## Estrutura de pastas
- `backend/` – API, Prisma e middlewares de autenticação.
- `admin-frontend/` – Aplicação React (login, dashboard, lista de personais e configurações).

## Backend
1. Crie o arquivo de variáveis (baseado no `.env.example`):
   ```bash
   cd backend
   cp .env.example .env
   # Ajuste DATABASE_URL e JWT_SECRET
   ```
2. Instale dependências:
   ```bash
   npm install
   ```
3. Gere o Prisma Client e rode as migrações (necessário PostgreSQL acessível):
   ```bash
   npx prisma migrate dev --name init
   ```
4. Suba o servidor em modo dev:
   ```bash
   npm run dev
   ```
5. Criando um ADMIN manualmente (apenas uma sugestão):
   - Abra o Prisma Studio `npx prisma studio` e insira um registro em `User` com `role=ADMIN` e `passwordHash` gerado via `bcrypt` **ou**
   - Rode um script/SQL manual; a rota `/auth/register` bloqueia criação de ADMIN para forçar controle manual.

Principais rotas:
- `POST /auth/login` – login e obtenção de JWT.
- `GET /admins/personals` – listagem paginada com filtro de status.
- `GET/PUT /admins/personals/:id` – detalhes e edição de dados do personal.
- `PATCH /admins/personals/:id/plan-status` – atualização de status do plano.
- `GET /admins/metrics` – métricas para o dashboard.
- `GET/PUT /admins/config` – configurações gerais.

## Frontend (admin)
1. Configure as variáveis (se necessário):
   ```bash
   cd admin-frontend
   cp .env.example .env
   # Ajuste VITE_API_URL se o backend não estiver em http://localhost:3001
   ```
2. Instale dependências:
   ```bash
   npm install
   ```
3. Rode em modo desenvolvimento:
   ```bash
   npm run dev
   ```

Fluxo esperado:
- Login em `/login` com um usuário `ADMIN`.
- Após logar, o token fica no `localStorage` e as rotas do painel são protegidas.
- Dashboard mostra métricas básicas; “Personais” lista com paginação/edição; “Configurações” ajusta dados gerais do software.

## Próximos passos sugeridos
- Adicionar testes (e2e/API) e validações mais fortes nas rotas.
- Implementar refresh token e expiração do JWT.
- Conectar planos/pagamentos reais e relatórios de cobrança.
