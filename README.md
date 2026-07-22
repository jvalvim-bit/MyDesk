<div align="center">

<img src="https://img.shields.io/badge/MyDesk-Workspace%20Inteligente-6366f1?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAzMiAzMic+PHJlY3Qgd2lkdGg9JzMyJyBoZWlnaHQ9JzMyJyByeD0nOCcgZmlsbD0nIzYzNjZmMScvPjx0ZXh0IHk9JzIyJyB4PSc1JyBmb250LXNpemU9JzIwJz7wn5KLPHt0ZXh0Pjwvc3ZnPg==" />

# MyDesk — Workspace de Notas Inteligente

**Organize ideias, gerencie clientes e colabore em tempo real — tudo em um único lugar.**

[![Deploy](https://img.shields.io/badge/Deploy-GitHub%20Pages-222?style=flat-square&logo=github)](https://jvalvim-bit.github.io/MyDesk/)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Vercel](https://img.shields.io/badge/API-Vercel-000?style=flat-square&logo=vercel)](https://vercel.com)
[![License](https://img.shields.io/badge/License-MIT-10b981?style=flat-square)](LICENSE)

[**Acessar o site →**](https://jvalvim-bit.github.io/MyDesk/) &nbsp;·&nbsp; [Reportar bug](https://github.com/jvalvim-bit/MyDesk/issues) &nbsp;·&nbsp; [Solicitar feature](https://github.com/jvalvim-bit/MyDesk/issues)

</div>

---

## Visão Geral

O **MyDesk** é um workspace colaborativo de notas com visual dark e foco em produtividade. Diferente de apps de notas tradicionais, o MyDesk combina num board visual interativo:

- **Notas posicionáveis** com drag-and-drop, redimensionamento e pilhas automáticas
- **CRM financeiro** integrado nas notas para gestão de clientes
- **Chat em tempo real** 1:1 e em grupo
- **Workspaces compartilhados** sincronizados ao vivo com amigos
- **Sistema de planos** com pagamento via Pix (AbacatePay)

Tudo construído com JavaScript puro, sem frameworks, usando Firebase como backend em tempo real.

---

## Screenshots

<table>
<tr>
<td align="center" width="50%">

**Landing Page & Login**

[![Landing](https://placehold.co/600x340/0d0d0d/6366f1?text=Landing+Page+%2B+Login)](https://jvalvim-bit.github.io/MyDesk/)

*Typewriter animado, login por e-mail/senha ou Google OAuth*

</td>
<td align="center" width="50%">

**Board de Notas**

[![Board](https://placehold.co/600x340/0a0a0a/10b981?text=Board+de+Notas)](https://jvalvim-bit.github.io/MyDesk/)

*Notas coloridas com drag-and-drop, pilhas, status e anexos*

</td>
</tr>
<tr>
<td align="center" width="50%">

**CRM Financeiro** *(Premium)*

[![CRM](https://placehold.co/600x340/111111/f59e0b?text=CRM+Financeiro)](https://jvalvim-bit.github.io/MyDesk/)

*Dashboard com totalizadores de receita e gestão de clientes*

</td>
<td align="center" width="50%">

**Chat em Tempo Real**

[![Chat](https://placehold.co/600x340/111111/a5b4fc?text=Chat+em+Tempo+Real)](https://jvalvim-bit.github.io/MyDesk/)

*Janelas flutuantes 1:1 com envio de arquivos e imagens*

</td>
</tr>
<tr>
<td align="center" colspan="2">

**Painel Social — Amigos & Workspaces**

[![Social](https://placehold.co/600x200/0d0d0d/14b8a6?text=Painel+Social+%E2%80%94+Amigos+%26+Workspaces)](https://jvalvim-bit.github.io/MyDesk/)

*Gerenciamento de amigos, pedidos pendentes, workspaces e grupos*

</td>
</tr>
</table>

---

## Funcionalidades

### Sistema de Notas (Core)

O board é um canvas infinito onde as notas são cartões posicionáveis com:

| Recurso | Detalhe |
|---|---|
| **19 paletas de cores** | Cada cor coordena barra, chip, dot e fundo do card |
| **4 status de progresso** | A Fazer · Andamento · Concluído · Encerrado |
| **Datas e lembretes** | Início, prazo e alerta automático (1-365 dias antes) |
| **Redimensionamento** | Arraste o canto inferior direito para ajustar tamanho |
| **Drag-and-drop** | Mova notas livremente pelo board |
| **Anexos** | PDF, imagens, TXT — visualizados dentro da nota |
| **Pilhas (Stacks)** | Arraste uma nota sobre outra para empilhar automaticamente |
| **Pin** | Fixe notas importantes para que não colapsem nas pilhas |

**Status visuais:**
- 🔵 **A Fazer** — dot slate sem animação
- 🟣 **Andamento** — dot índigo com glow pulsante + som
- 🟢 **Concluído** — dot esmeralda + som de vitória
- 🔴 **Encerrado** — dot vermelho

**Limite do plano Free:** 30 notas/mês (reseta todo dia 1º).

---

### Sistema de Pilhas (Stacks)

Agrupe notas relacionadas em pilhas compactas:

1. Arraste uma nota e solte sobre outra → pilha é criada automaticamente
2. Clique no header da pilha para expandir/recolher
3. Renomeie e recolora a pilha pelo header
4. Arraste uma nota para fora para desempilhar
5. Use **"Reorganizar"** na toolbar para alinhar pilhas em colunas limpas

---

### Autenticação

| Método | Detalhe |
|---|---|
| **E-mail + Senha** | Mínimo 8 caracteres com letras e números |
| **Google OAuth** | Login com popup — cria username automaticamente |
| **Sessão persistente** | Não expira (Firebase `LOCAL` persistence) |
| **Modo Demo** | Funciona offline com LocalStorage (sem sincronização) |

---

### Sistema de Amigos & Presença

- **Busca por @username** — encontre qualquer usuário cadastrado
- **Pedido de amizade** — fluxo de aceitar/recusar em tempo real
- **Status de presença** — Online · Offline · Ocupado com dot colorido
- **Upload de foto de perfil** — drag/drop ou clique na foto
- **Perfil com bio e função** — visível para amigos

---

### Chat em Tempo Real

- **1:1 entre amigos** — mensagens sincronizadas via Firebase
- **Janelas flutuantes draggable** — mova o chat para qualquer posição
- **Múltiplas abas** — converse com vários amigos ao mesmo tempo
- **Envio de arquivos** — até 5MB por mensagem (imagens, PDFs)
- **Lightbox para imagens** — clique para ampliar
- **Notificações** — toast + som quando o amigo está online
- **Limpar conversa** — apaga histórico local e no Firebase

---

### Workspaces Pessoais (1:1)

Board compartilhado entre dois amigos:

- **Sincronização bidirecional** em menos de 100ms via Firebase
- Ambos podem criar, editar e deletar notas
- Stacks compartilhados entre os dois usuários
- **Sair temporariamente** ou **Excluir workspace** com confirmação
- Disponível no plano **Free e Premium**

---

### Workspaces de Grupo *(Premium)*

> Exige plano Premium ativo.

- Crie grupos com nome e convide amigos
- Board compartilhado entre todos os membros
- **Chat de grupo** integrado com histórico
- Owner pode remover membros (`kickGroupMember`)
- Compressão automática de imagens (max 400KB) para economizar banda
- Owner pode encerrar o grupo (todos são desconectados)

---

### CRM Financeiro *(Premium)*

Dashboard integrado ao board para gestão de clientes e cobranças:

**Totalizadores automáticos:**
| Métrica | Cálculo |
|---|---|
| Total Esperado | Soma de todos os valores cadastrados |
| Total Recebido | Soma dos `status: 'paid'` |
| Total Pendente | Soma dos `status: 'pending'` |
| Atrasados | Count com `dueDate < hoje` e `status: 'pending'` |

**Nota de Cliente:**
- Campos: nome, serviço/descrição, valor (R$), vencimento, status
- Cria simultaneamente uma nota visual no board + registro no CRM
- Edição inline de valor, data e status
- Status visual: 🟢 Pago · 🟡 Pendente · 🔴 Atrasado (pulsando)
- Sincroniza bidirecional: editar na nota atualiza o CRM e vice-versa

---

### Pagamentos via Pix

Fluxo completo de assinatura Premium:

```
Usuário atinge limite Free
        ↓
Modal "MyDesk Premium" com CTA
        ↓
API /api/create-charge → AbacatePay
        ↓
QR Code Pix + Código copia-e-cola
        ↓
Pagamento confirmado pela AbacatePay
        ↓
Webhook /api/webhook → Firebase
        ↓
plan: 'premium' + expiry +30 dias
        ↓
App detecta ?premium=activated → reload
```

- **Valor:** R$ 10,00/mês
- **Gateway:** AbacatePay (Pix instantâneo)
- **Validade:** 30 dias a partir da confirmação
- **Renovação:** Manual (sem cobrança automática)

---

### Fundo Personalizado (Wallpaper)

Cada usuário pode personalizar o fundo do board:

- **11 cores sólidas** — de preto a azul escuro
- **13 gradientes** — índigo→violeta, esmeralda→teal, etc.
- **Pixel Art** — padrões geométricos renderizados via Canvas
- **Upload de imagem** — drag/drop com compressão automática
- Persistido por usuário no Firebase

---

### Lo-Fi Radio 🎵

- Streams de rádio copyright-free via **SomaFM**
- Play/Pause na toolbar
- Navega entre estações (Indie Pop, Lo-Fi Beats, Space, etc.)
- Exibe nome da faixa tocando
- Continua tocando ao navegar pelo app

---

### Undo / Restaurar

- Qualquer nota deletada pode ser **restaurada em até 30 segundos**
- Botão "Restaurar" aparece na toolbar após cada exclusão
- Suporta desfazer ações em workspaces pessoais e de grupo

---

### Sorting & Filtragem

9 modos de ordenação disponíveis no board:

| Modo | Descrição |
|---|---|
| Padrão | Posição x/y original no board |
| Mais antigas | Por data de criação (ASC) |
| Mais recentes | Por data de criação (DESC) |
| A → Z | Título alfabético crescente |
| Z → A | Título alfabético decrescente |
| Prazo próximo | Urgentes primeiro |
| Prazo distante | Futuros primeiro |
| Por status | Todo → Andamento → Concluído → Encerrado |
| Por cor | Agrupa paletas iguais |

---

### Painel Administrativo *(Admin Only)*

Acessível apenas para contas com custom claim `admin: true` no Firebase:

- Botão de escudo 🛡️ aparece na toolbar apenas para admins
- Visualiza todos os usuários cadastrados
- Ativa/desativa plano Premium manualmente
- Monitora status de presença
- Admins ignoram **todos** os limites de plano automaticamente

---

## Planos

| Recurso | Free | Premium |
|---|:---:|:---:|
| Notas por mês | 30 | Ilimitadas |
| Workspaces pessoais (1:1) | ✅ | ✅ |
| Workspaces de grupo | ❌ | ✅ |
| CRM Financeiro | ❌ | ✅ |
| Chat em tempo real | ✅ | ✅ |
| Presença de amigos | ✅ | ✅ |
| Wallpaper personalizado | ✅ | ✅ |
| Lo-Fi Radio | ✅ | ✅ |
| Anexos (até 5MB) | ✅ | ✅ |
| Suporte prioritário | ❌ | ✅ |
| **Valor** | R$ 0 | R$ 10/mês |

---

## Tecnologias

### Frontend
- **HTML5 / CSS3 / JavaScript ES6+** — sem frameworks
- **Firebase JS SDK v9.23.0** (compat) — Auth + Realtime Database
- **Canvas API** — QR Code Pix, pixel art, visualizador de PDF
- **Web Audio API** — sons de status e notificações

### Backend & APIs
- **Vercel Serverless Functions (Node.js)** — API de pagamento e webhook
- **Firebase Admin SDK** — custom claims e operações privilegiadas
- **AbacatePay API** — pagamentos via Pix

### Infraestrutura
- **GitHub Pages** — hospedagem estática
- **Vercel** — funções serverless (`/api/*`)
- **Firebase Realtime Database** — sincronização em tempo real
- **Firebase Authentication** — autenticação segura

---

## Estrutura do Projeto

```
mydesk/
├── index.html              # App principal (board + toolbar)
├── login.html              # Landing page + autenticação
│
├── css/
│   └── main.css            # Todos os estilos (design tokens, componentes)
│
├── js/
│   ├── firebase-init.js    # Inicialização do Firebase
│   ├── auth-service.js     # Estado de autenticação centralizado (window.authState)
│   ├── app.js              # Toda a lógica do app (~3500+ linhas)
│   └── login.js            # Lógica de login, registro e typewriter
│
├── api/
│   ├── create-charge.js    # POST /api/create-charge → AbacatePay
│   └── webhook.js          # POST /api/webhook → AbacatePay → Firebase
│
├── scripts/
│   ├── set-admin.js        # node scripts/set-admin.js email@x.com
│   └── remove-admin.js     # node scripts/remove-admin.js email@x.com
│
├── database.rules.json     # Regras de segurança do Firebase Realtime DB
├── firebase.json           # Config Firebase CLI
├── vercel.json             # Config Vercel (se presente)
└── .gitignore              # Ignora .env, serviceAccountKey.json, node_modules
```

---

## Estrutura do Firebase

```
mydesk-ad0da/ (Realtime Database)
├── users/
│   └── {uid}/
│       ├── profile         → { username, name, email, role, photo }
│       ├── plan            → { plan, planExpiresAt, notesCreatedThisMonth, lastReset }
│       ├── presence        → { status, lastSeen }
│       ├── notes/          → { noteId: { ...note } }
│       ├── crm_records/    → { recordId: { ...record } }
│       ├── friends/        → { accepted, pending, blocked }
│       ├── wallpaper       → { type, value }
│       └── inbox/          → { pushId: { type, data } }
│
├── shared_boards/
│   └── {user1__user2}/     → workspace pessoal
│       ├── notes/
│       └── files/
│
├── group_boards/
│   └── {groupId}/          → workspace de grupo
│       ├── notes/
│       └── files/
│
├── groups/
│   └── {groupId}/          → { name, owner, members }
│
├── chats/
│   └── {key}/messages/     → chat 1:1
│
├── groupChats/
│   └── {groupId}/messages/ → chat de grupo
│
├── usernames/              → { @username: uid }
└── uids/                   → { uid: @username }
```

---

## Configuração Local

### Pré-requisitos

- Node.js 18+
- Conta no [Firebase](https://firebase.google.com)
- Conta no [AbacatePay](https://abacatepay.com) *(opcional, só para pagamentos)*
- [Vercel CLI](https://vercel.com/cli) *(opcional, para funções serverless locais)*

### 1. Clonar o repositório

```bash
git clone https://github.com/jvalvim-bit/MyDesk.git
cd MyDesk
```

### 2. Configurar Firebase

Edite `js/firebase-init.js` com as credenciais do seu projeto Firebase:

```javascript
const firebaseConfig = {
  apiKey:            "sua-api-key",
  authDomain:        "seu-projeto.firebaseapp.com",
  databaseURL:       "https://seu-projeto-default-rtdb.firebaseio.com",
  projectId:         "seu-projeto",
  storageBucket:     "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:xxx:web:xxx"
};
```

### 3. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz (nunca comitar):

```env
ABACATE_PAY_API_KEY=sua-chave-abacatepay
WEBHOOK_SECRET=segredo-aleatorio-forte
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
FIREBASE_DATABASE_URL=https://seu-projeto-default-rtdb.firebaseio.com
```

### 4. Regras do Firebase

Deploy das regras de segurança:

```bash
npm install -g firebase-tools
firebase login
firebase use seu-projeto
firebase deploy --only database
```

### 5. Rodar localmente

O projeto é estático — basta abrir `index.html` em um servidor local:

```bash
npx serve .
# ou
python -m http.server 8000
```

Para testar as funções serverless localmente:

```bash
npm install -g vercel
vercel dev
```

---

## Gerenciar Administradores

### Adicionar admin

```bash
node scripts/set-admin.js email@exemplo.com
# ou por UID:
node scripts/set-admin.js --uid UID_DO_USUARIO
```

### Remover admin

```bash
node scripts/remove-admin.js email@exemplo.com
```

> Requer `serviceAccountKey.json` na raiz e o `.env` configurado.

---

## Segurança

O projeto implementa as seguintes proteções:

| Proteção | Implementação |
|---|---|
| **Autenticação** | Firebase Auth JWT com persistência `LOCAL` |
| **Autorização** | Firebase Rules — dados isolados por UID |
| **Admin** | Custom Claims server-side (`admin: true`) |
| **XSS** | Função `xe()` escapa HTML em inputs dinâmicos |
| **Webhook** | `crypto.timingSafeEqual` contra timing attacks |
| **CORS** | Whitelist de origins na API de pagamento |
| **Upload** | Validação de MIME type + extensão (bloqueia .exe, .bat, .sh) |
| **Rate limiting** | Limite de 30 notas/mês no plano Free (Firebase Rules) |

---

## Contribuindo

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Commit suas mudanças: `git commit -m 'feat: adicionar minha feature'`
4. Push: `git push origin feature/minha-feature`
5. Abra um Pull Request

---

## Licença

Distribuído sob a licença MIT. Veja [`LICENSE`](LICENSE) para mais informações.

---

<div align="center">

Feito com ☕ por [jvalvim-bit](https://github.com/jvalvim-bit)

**[⬆ Voltar ao topo](#mydesk--workspace-de-notas-inteligente)**

</div>
