import { createClient } from "@supabase/supabase-js"

// Estas variáveis de ambiente devem ser configuradas no seu ambiente de produção
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Verificar se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL ou Anon Key não definidos nas variáveis de ambiente")
}

let supabaseClient: any = null

// Função para inicializar o Supabase (lado do cliente)
export const getSupabase = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL ou Anon Key não definidos nas variáveis de ambiente")
    return null
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  }

  return supabaseClient
}

// Criar cliente Supabase para uso no lado do cliente
export const supabase = {
  from: (table: string) => {
    const client = getSupabase()
    if (!client) {
      // Return a mock object that mimics the Supabase API structure
      return {
        select: (columns?: string) => ({
          eq: (column: string, value: any) =>
            Promise.resolve({ data: null, error: new Error("Supabase não inicializado") }),
          insert: (data: any) => Promise.resolve({ data: null, error: new Error("Supabase não inicializado") }),
          update: (data: any) => Promise.resolve({ data: null, error: new Error("Supabase não inicializado") }),
          delete: () => Promise.resolve({ data: null, error: new Error("Supabase não inicializado") }),
          upsert: (data: any) => Promise.resolve({ data: null, error: new Error("Supabase não inicializado") }),
          order: (column: string, options?: any) => ({
            eq: (column: string, value: any) =>
              Promise.resolve({ data: null, error: new Error("Supabase não inicializado") }),
          }),
          single: () => Promise.resolve({ data: null, error: new Error("Supabase não inicializado") }),
        }),
        insert: (data: any) => Promise.resolve({ data: null, error: new Error("Supabase não inicializado") }),
        update: (data: any) => Promise.resolve({ data: null, error: new Error("Supabase não inicializado") }),
        delete: () => Promise.resolve({ data: null, error: new Error("Supabase não inicializado") }),
        upsert: (data: any) => Promise.resolve({ data: null, error: new Error("Supabase não inicializado") }),
      }
    }
    return client.from(table)
  },
  auth: {
    signIn: () => {
      const client = getSupabase()
      if (!client) {
        return Promise.resolve({ data: null, error: new Error("Supabase não inicializado") })
      }
      return client.auth.signInWithPassword
    },
    signOut: () => {
      const client = getSupabase()
      if (!client) {
        return Promise.resolve({ error: new Error("Supabase não inicializado") })
      }
      return client.auth.signOut()
    },
    onAuthStateChange: (callback: any) => {
      const client = getSupabase()
      if (!client) {
        return { data: { subscription: { unsubscribe: () => {} } } }
      }
      return client.auth.onAuthStateChange(callback)
    },
  },
  storage: {
    from: (bucket: string) => {
      const client = getSupabase()
      if (!client) {
        return {
          upload: () => Promise.resolve({ data: null, error: new Error("Supabase não inicializado") }),
          download: () => Promise.resolve({ data: null, error: new Error("Supabase não inicializado") }),
          getPublicUrl: () => ({ data: { publicUrl: "" } }),
        }
      }
      return client.storage.from(bucket)
    },
  },
  rpc: (fn: string, params: any) => {
    const client = getSupabase()
    if (!client) {
      return Promise.resolve({ data: null, error: new Error("Supabase não inicializado") })
    }
    return client.rpc(fn, params)
  },
}

// Função para salvar pagamento no Supabase
export async function salvarPagamento(pagamento: any) {
  try {
    // Garantir que o pagamento tenha um ID
    if (!pagamento.id) {
      throw new Error("ID do pagamento não definido")
    }

    const { data, error } = await supabase.from("pagamentos").insert(pagamento).select()

    if (error) throw error

    return data
  } catch (error) {
    console.error("Erro ao salvar pagamento no Supabase:", error)
    throw error
  }
}

// Função para buscar pagamentos do Supabase
export async function buscarPagamentos() {
  try {
    const { data, error } = await supabase.from("pagamentos").select("*").order("data", { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Erro ao buscar pagamentos do Supabase:", error)
    return []
  }
}

// Função para salvar cheque no Supabase
export async function salvarCheque(cheque: any) {
  try {
    // Garantir que o cheque tenha um ID e um pagamentoId
    if (!cheque.id) {
      throw new Error("ID do cheque não definido")
    }

    if (!cheque.pagamentoId) {
      throw new Error("ID do pagamento não definido no cheque")
    }

    const { data, error } = await supabase.from("cheques").insert(cheque).select()

    if (error) throw error

    return data
  } catch (error) {
    console.error("Erro ao salvar cheque no Supabase:", error)
    throw error
  }
}

// Adicionar esta função no final do arquivo

// Função para gerar UUID válido usando o Supabase
export async function gerarUUID(): Promise<string> {
  try {
    // Chamar a função uuid_generate_v4() do PostgreSQL
    const { data, error } = await supabase.rpc("gerar_uuid")

    if (error) {
      console.error("Erro ao gerar UUID:", error)
      // Fallback para UUID gerado no cliente se houver erro
      return crypto.randomUUID()
    }

    return data
  } catch (error) {
    console.error("Erro ao gerar UUID:", error)
    // Fallback para geração local
    return crypto.randomUUID()
  }
}

/**
 * Valida se uma string é um UUID válido usando o Supabase
 * Com fallback para validação local se o Supabase não estiver disponível
 */
export async function validarUUIDSupabase(uuid: string): Promise<boolean> {
  try {
    const supabase = createClient()

    // Tentar validar UUID usando a função RPC do Supabase
    const { data, error } = await supabase.rpc("is_valid_uuid", { uuid })

    if (error) {
      console.warn("Erro ao validar UUID via Supabase:", error.message)
      // Fallback para validação local
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)
    }

    return data
  } catch (error) {
    console.warn("Erro ao conectar com Supabase para validar UUID:", error)
    // Fallback para validação local
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)
  }
}

