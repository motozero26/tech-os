# TechOS — Sistema de Gestão para Assistência Técnica & Varejo

Sistema SaaS multi-tenant completo para gestão operacional, financeira, comercial e fiscal de lojas de assistência técnica e varejo (smartphones, computadores e eletrônicos).

---

## 🚀 Tecnologias

* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons.
* **Backend**: Node.js, Express, TypeScript.
* **Banco de Dados**: SQLite (embarcado) / Supabase (PostgreSQL em nuvem).
* **Gateways de Pagamento**: Mercado Pago e InfinitePay (PIX automático e webhooks).
* **Módulo Fiscal**: NF-e SEFAZ (Certificado A1) e NFS-e MEI (Padrão Nacional).

---

## 📁 Estrutura do Repositório

```text
├── client/              # Aplicação Frontend React (Vite SPA)
├── server/              # API Backend Node.js / Express
├── supabase/            # Script DDL PostgreSQL para Supabase
│   └── schema.sql       # Schema completo com tabelas, chaves e seeds
├── vercel.json          # Configuração de build e SPA rewrites para Vercel
├── package.json         # Workspace root (monorepo npm)
└── README.md
```

---

## 🌐 Como Publicar no GitHub

1. Crie um repositório vazio no seu [GitHub](https://github.com/new) com o nome desejado (ex: `techos`).
2. No terminal do projeto, execute os comandos:

```bash
git remote add origin https://github.com/<SEU_USUARIO>/<SEU_REPOSITORIO>.git
git push -u origin main
```

---

## ⚡ Como Publicar na Vercel (Frontend)

1. Acesse o dashboard da [Vercel](https://vercel.com/) e clique em **Add New > Project**.
2. Importe o repositório do GitHub.
3. Nas configurações do projeto:
   * **Framework Preset**: `Vite`
   * **Root Directory**: `./` (ou `./client`)
   * **Build Command**: `npm run build --workspace=client`
   * **Output Directory**: `client/dist`
4. Em **Environment Variables**, adicione:
   * `VITE_API_URL`: URL onde sua API backend está hospedada (ex: `https://api.techos.com.br`).
5. Clique em **Deploy**. O arquivo `vercel.json` na raiz já configura os rewrites para roteamento client-side sem erros 404 ao recarregar a página.

---

## 🐘 Como Utilizar o Supabase (PostgreSQL)

1. Acesse o [Supabase](https://supabase.com/) e crie um novo projeto.
2. No menu lateral, acesse o **SQL Editor**.
3. Abra o arquivo `supabase/schema.sql` deste projeto, copie todo o seu conteúdo e execute no SQL Editor do Supabase.
4. Todas as tabelas, relacionamentos, planos (Prata e Ouro), configurações e o usuário administrador padrão serão criados automaticamente.

---

## 💻 Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Iniciar backend e frontend simultaneamente
npm run dev

# Ou iniciar separadamente:
npm run dev --workspace=server    # Backend em http://localhost:5000
npm run dev --workspace=client    # Frontend em http://localhost:3000
```
