# SafeWord API

Uma API robusta para detecção de conteúdo impróprio em textos, utilizando tecnologias modernas como Upstash Vector, LangChain e Hono.

## 📋 Sumário
- [Visão Geral](#visão-geral)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [Endpoints](#endpoints)
- [Deploy](#deploy)
- [Desenvolvimento](#desenvolvimento)
- [Estrutura do Projeto](#estrutura-do-projeto)

## 🎯 Visão Geral

SafeWord API é uma solução para análise e detecção de conteúdo impróprio em textos. A API utiliza processamento semântico e análise palavra por palavra para identificar possível conteúdo inadequado, oferecendo uma pontuação de confiança para cada análise.

### Principais Funcionalidades:
- Análise semântica de texto
- Detecção palavra por palavra
- Sistema de whitelist para contextos específicos
- Pontuação de confiança para resultados
- Suporte a diferentes idiomas

## 🛠 Tecnologias

- Node.js
- TypeScript
- Hono (Framework web)
- Upstash Vector (Base vetorial)
- LangChain (Processamento de texto)
- Cloudflare Workers (Deploy)

## ⚙️ Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn
- Conta no Upstash para Vector Database
- Cloudflare Account (para deploy)

## 📦 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/safeword-api.git
cd safeword-api
```

2. Instale as dependências:
```bash
npm install
```

## 🔧 Configuração

1. Crie um arquivo `.env` na raiz do projeto:
```env
VECTOR_URL=sua_url_do_upstash_vector
VECTOR_TOKEN=seu_token_do_upstash
```

2. Configure o Upstash Vector:
- Crie uma conta em [Upstash](https://upstash.com)
- Crie um novo banco Vector
- Copie as credenciais para o arquivo `.env`

## 🚀 Uso

### Desenvolvimento Local

1. Execute em modo desenvolvimento:
```bash
npm run dev
```

2. Build do projeto:
```bash
npm run build
```

3. Iniciar em produção:
```bash
npm start
```

### Endpoints

#### POST /
Analisa um texto para detectar conteúdo impróprio.

**Request Body:**
```json
{
  "message": "texto para analisar"
}
```

**Response:**
```json
{
  "isImproprio": boolean,
  "pontuacao": number,
  "flag": string (opcional),
  "contexto": string (opcional)
}
```

## 🌐 Deploy

O projeto está configurado para deploy no Cloudflare Workers.

1. Configure o Wrangler:
```bash
npm install -g wrangler
wrangler login
```

2. Deploy da aplicação:
```bash
npm run deploy
```

## 💻 Desenvolvimento

### Scripts Disponíveis

- `npm run dev`: Inicia o servidor em modo desenvolvimento com hot-reload
- `npm run build`: Compila o projeto TypeScript
- `npm start`: Inicia o servidor em modo produção
- `npm run deploy`: Realiza o deploy para Cloudflare Workers

### Estrutura do Projeto

```
safeword-api/
├── src/
│   ├── index.ts              # Ponto de entrada
│   ├── textProcessor.ts      # Processamento de texto
│   └── profanityDetector.ts  # Detector de conteúdo impróprio
├── dist/                     # Código compilado
├── .env                      # Variáveis de ambiente
├── package.json
└── tsconfig.json
```

## ⚠️ Limites e Restrições

- Máximo de 35 palavras por mensagem
- Máximo de 1000 caracteres por mensagem
- Rate limiting baseado no plano do Upstash

## 🔍 Customização

### Configuração de Thresholds

Você pode ajustar os thresholds de detecção no arquivo de configuração:

```typescript
const CONFIG = {
  WORD_THRESHOLD: 0.95,    // Threshold para palavras individuais
  SEMANTIC_THRESHOLD: 0.96, // Threshold para análise semântica
  // ...
}
```

### Whitelist

Para adicionar palavras à whitelist, modifique o objeto `ALLOWED_WORDS`:

```typescript
const ALLOWED_WORDS = {
  GENERAL: new Set(['palavra1', 'palavra2']),
  CONTEXT_SPECIFIC: new Map([
    ['palavra', ['contexto permitido 1', 'contexto permitido 2']]
  ])
}
```

## 🤝 Contribuindo

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add: nova feature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença ISC. Veja o arquivo `LICENSE` para mais detalhes.

## 📧 Suporte

Para suporte e dúvidas, por favor abra uma issue no repositório do projeto.
