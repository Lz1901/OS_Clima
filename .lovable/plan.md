# SaaS PMOC Digital — Plano de Construção

Projeto enorme. Vou construir em fases entregáveis, começando pela fundação (auth multi-tenant + estrutura) e iterando módulo a módulo. Cada fase fica funcional antes da próxima.

## Stack
- React + TypeScript + Tailwind + shadcn/ui (template TanStack Start via `add_artifact web_app`)
- Lovable Cloud (Supabase) — auth, Postgres com RLS, Storage
- jsPDF + html2canvas para geração de PDF
- react-signature-canvas para assinatura digital
- Edge Function para envio de email (Lovable Emails)

## Arquitetura Multi-Tenant
Tabela `companies` + coluna `company_id` em todas as tabelas. Tabela separada `user_roles` (enum: admin, tecnico, financeiro, supervisor) com função `has_role()` security definer. RLS em todas as tabelas filtrando por `company_id` do usuário logado via função `get_user_company_id()`.

## Schema do Banco
```
companies (id, nome, logo_url, cnpj, endereco, telefone, email, crea, resp_tecnico, assinatura_url, cor_primary)
profiles (id=auth.uid, company_id, nome, email)
user_roles (id, user_id, company_id, role)
clientes (id, company_id, razao_social, nome_fantasia, cnpj, ...)
unidades (id, cliente_id, tipo, nome, endereco, ...)
equipamentos (id, unidade_id, marca, modelo, btus, tipo, serie, ...)
equipamento_fotos (id, equipamento_id, url)
checklist_templates (id, company_id, nome)
checklist_items (id, template_id, categoria, label, tipo_campo, obrigatorio, ordem)
pmocs (id, company_id, cliente_id, unidade_id, tecnico_id, status, data, pdf_url)
pmoc_equipamentos (id, pmoc_id, equipamento_id)
pmoc_respostas (id, pmoc_id, equipamento_id, item_id, valor, foto_url)
pmoc_fotos (id, pmoc_id, url, descricao)
assinaturas (id, pmoc_id, tipo, nome, imagem_url, ip, device, created_at)
notificacoes (id, company_id, user_id, tipo, mensagem, lida)
activity_logs (id, company_id, user_id, acao, detalhes)
```

## Fases de Entrega

**Fase 1 — Fundação (esta entrega)**
- Scaffold web_app
- Habilitar Lovable Cloud
- Migrations: schema completo + RLS
- Auth: login, signup (cria empresa), recuperação senha, logout
- Layout: sidebar moderna, topbar, tema claro/escuro, design system
- Dashboard com cards de métricas (queries reais)
- CRUD Clientes + Unidades
- CRUD Equipamentos com upload de fotos
- Página Configurações da Empresa

**Fase 2 (próxima mensagem do usuário)**
- Checklist templates configuráveis
- Fluxo PMOC mobile-first (wizard)
- Assinatura digital touch
- Geração PDF profissional
- Edge function envio email com PDF anexo
- QR Code por equipamento + página pública de validação

**Fase 3**
- Histórico por equipamento
- Notificações (PMOC vencendo/atrasado)
- Logs de atividade
- Filtros avançados + pesquisa global
- Exportações

## Visual
Design clean inspirado em Linear/Stripe: sidebar escura compacta, conteúdo branco/cinza muito claro, accent azul corporativo (customizável por empresa via CSS var), tipografia Inter, cards com sombra sutil, mobile-first com bottom nav para técnicos.

## Detalhes técnicos
- Roles via `user_roles` table + `has_role()` security definer (nunca em profiles)
- RLS policies usam `get_user_company_id()` para isolar tenants
- Storage buckets: `logos` (public), `equipamentos` (public), `pmoc-fotos` (public), `assinaturas` (public), `pdfs` (public)
- Signup cria company + profile + user_role admin via trigger
- Loading states, toasts, validação zod em formulários

## Escopo desta entrega
Tudo da Fase 1. É muito código mas entrego funcional end-to-end. PMOC/PDF/email ficam para a próxima rodada após você validar a base — se preferir que eu emende tudo numa só, me avise e sigo.