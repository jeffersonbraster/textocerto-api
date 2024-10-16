import { Index } from '@upstash/vector'
import { Hono } from 'hono'
import { env } from 'hono/adapter'
import { cors } from 'hono/cors'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'

// Interfaces
type Environment = {
  VECTOR_URL: string
  VECTOR_TOKEN: string
}

interface RequestBody {
  message: string
}

interface FlaggedContent {
  score: number
  context: string
}

interface FlaggedResult {
  flag: string
  details: FlaggedContent
}

interface TextAnalysisResult {
  isImproprio: boolean
  pontuacao: number
  flag?: string
  contexto?: string
}

// Configurações
const CONFIG = {
  CHUNK_SIZE: 25,
  CHUNK_OVERLAP: 8,
  WORD_THRESHOLD: 0.95,
  SEMANTIC_THRESHOLD: 0.96,
  MAX_WORDS: 35,
  MAX_CHARS: 1000,
  SANITIZATION_REGEX: /[^\w\s]/g,
} as const

// Palavras permitidas
const ALLOWED_WORDS = {
  GENERAL: new Set(['black', 'swear']),
  CONTEXT_SPECIFIC: new Map<string, string[]>([
    ['black', ['black belt', 'black coffee', 'black friday']],
  ])
} as const

class TextProcessor {
  private readonly splitter: RecursiveCharacterTextSplitter

  constructor() {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: CONFIG.CHUNK_SIZE,
      separators: [' '],
      chunkOverlap: CONFIG.CHUNK_OVERLAP,
    })
  }

  public sanitizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(CONFIG.SANITIZATION_REGEX, '')
      .trim()
  }

  public async splitText(text: string): Promise<{
    words: string[]
    semantics: string[]
  }> {
    const words = this.splitIntoWords(text)
    const semantics = await this.splitIntoSemantics(text)
    return { words, semantics }
  }

  private splitIntoWords(text: string): string[] {
    return text.split(/\s+/).filter(word => word.length > 0)
  }

  private async splitIntoSemantics(text: string): Promise<string[]> {
    if (this.splitIntoWords(text).length <= 1) return []
    const documents = await this.splitter.createDocuments([text])
    return documents.map(chunk => chunk.pageContent)
  }

  public isAllowedInContext(word: string, context: string): boolean {
    const contextSpecific = ALLOWED_WORDS.CONTEXT_SPECIFIC.get(word)
    if (!contextSpecific) return false
    return contextSpecific.some(allowedContext => context.includes(allowedContext))
  }
}

class ProfanityDetectorAPI {
  private readonly app: Hono
  private readonly textProcessor: TextProcessor

  constructor() {
    this.app = new Hono()
    this.textProcessor = new TextProcessor()
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware(): void {
    this.app.use(cors())
  }

  private setupRoutes(): void {
    this.app.post('/', async (c) => {
      try {
        return await this.handleDetection(c)
      } catch (err) {
        console.error('Error in profanity detection:', err)
        return c.json(
          { 
            error: 'Erro interno do servidor.', 
            details: err instanceof Error ? err.message : 'Unknown error' 
          },
          { status: 500 }
        )
      }
    })
  }

  private validateRequest(body: RequestBody): Response | null {
    const { message } = body

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Mensagem é obrigatória.' }),
        { status: 400 }
      )
    }

    const wordCount = message.split(/\s+/).length
    if (wordCount > CONFIG.MAX_WORDS || message.length > CONFIG.MAX_CHARS) {
      return new Response(
        JSON.stringify({
          error: `Limite excedido: máximo de ${CONFIG.MAX_WORDS} palavras ou ${CONFIG.MAX_CHARS} caracteres.`
        }),
        { status: 413 }
      )
    }

    return null
  }

  private setupVectorClient(c: any): Index {
    const { VECTOR_TOKEN, VECTOR_URL } = env<Environment>(c)
    return new Index({
      url: VECTOR_URL,
      token: VECTOR_TOKEN,
      cache: false,
    })
  }

  private async handleDetection(c: any): Promise<Response> {
    if (c.req.header('Content-Type') !== 'application/json') {
      return c.json({ error: 'Esperado corpo JSON.' }, { status: 406 })
    }

    const body = await c.req.json() as RequestBody
    const validationError = this.validateRequest(body)
    if (validationError) return validationError

    const index = this.setupVectorClient(c)
    const sanitizedMessage = this.textProcessor.sanitizeText(body.message)
    const { words, semantics } = await this.textProcessor.splitText(sanitizedMessage)

    const result = await this.analyzeContent(index, words, semantics, sanitizedMessage)
    return c.json(result)
  }

  private findHighestScore(flaggedContent: Map<string, FlaggedContent>): FlaggedResult | null {
    let highest: FlaggedResult | null = null
    let maxScore = -1

    flaggedContent.forEach((details, flag) => {
      if (details.score > maxScore) {
        maxScore = details.score
        highest = { flag, details }
      }
    })

    return highest
  }

  private async analyzeContent(
    index: Index,
    words: string[],
    semantics: string[],
    originalContext: string
  ): Promise<TextAnalysisResult> {
    const flaggedContent = new Map<string, FlaggedContent>()

    // Análise palavra por palavra
    await Promise.all(
      words.map(async (word) => {
        if (ALLOWED_WORDS.GENERAL.has(word)) return

        const [vector] = await index.query({
          topK: 1,
          data: word,
          includeMetadata: true,
        })

        if (vector?.score && vector.score > CONFIG.WORD_THRESHOLD) {
          const flaggedWord = vector.metadata?.text as string
          if (!this.textProcessor.isAllowedInContext(flaggedWord, originalContext)) {
            flaggedContent.set(flaggedWord, {
              score: vector.score,
              context: word,
            })
          }
        }
      })
    )

    // Análise semântica
    if (semantics.length > 0) {
      await Promise.all(
        semantics.map(async (chunk) => {
          const [vector] = await index.query({
            topK: 1,
            data: chunk,
            includeMetadata: true,
          })

          if (vector?.score && vector.score > CONFIG.SEMANTIC_THRESHOLD) {
            const flaggedPhrase = vector.metadata?.text as string
            flaggedContent.set(flaggedPhrase, {
              score: vector.score,
              context: chunk,
            })
          }
        })
      )
    }

    const highestScore = this.findHighestScore(flaggedContent)

    if (highestScore) {
      return {
        isImproprio: true,
        pontuacao: highestScore.details.score,
        flag: highestScore.flag,
        contexto: highestScore.details.context,
      }
    }

    return {
      isImproprio: false,
      pontuacao: 0,
    }
  }

  public getApp(): Hono {
    return this.app
  }
}

// Criar e exportar a instância da API
const profanityDetector = new ProfanityDetectorAPI()
export default profanityDetector.getApp()