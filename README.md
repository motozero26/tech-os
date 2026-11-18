# TechOS — Sistema de Gestão para Assistência Técnica & Varejo

[![GitHub Repository](https://img.shields.io/badge/GitHub-motozero26%2Ftech--os-blue?logo=github)](https://github.com/motozero26/tech-os)

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

O repositório já está configurado com arquivos `vercel.json` prontos para deploy automático, tanto a partir da raiz do monorepo quanto da pasta `client`.

### Opção Recomendada (Diretório Raiz `./`):
1. No dashboard da [Vercel](https://vercel.com/), clique em **Add New > Project** e importe o repositório `motozero26/tech-os`.
2. Mantenha as configurações padrão (a Vercel reconhecerá o preset `Vite` e o `vercel.json` da raiz automaticamente).
3. Se o painel solicitar confirmação:
   * **Framework Preset**: `Vite`
   * **Root Directory**: `./`
   * **Build Command**: `npm run build --workspace=client` (ou `npm run vercel-build`)
   * **Output Directory**: `client/dist`
4. Em **Environment Variables**, adicione (se backend externo):
   * `VITE_API_URL`: URL da sua API backend (ex: `https://api.seudominio.com`).
5. Clique em **Deploy**.

### Opção Alternativa (Root Directory `client`):
* Caso prefira definir o **Root Directory** como `client` nas opções da Vercel:
  * **Framework Preset**: `Vite`
  * **Root Directory**: `client`
  * **Build Command**: `vite build`
  * **Output Directory**: `dist`
  *(O arquivo `client/vercel.json` garante automaticamente os rewrites de SPA).*

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
