import { createClient } from "@supabase/supabase-js"

// Estas variáveis de ambiente devem ser configuradas no seu ambiente de produção
const supabaseUrl = "https://axofggykwirdyjekapns.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4b2ZnZ3lrd2lyZHlqZWthcG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyNDY5MzAsImV4cCI6MjA1NzgyMjkzMH0.aa3wgoH3RfdfOjU9moL8HEWLZMbTNSxxftbCcYmT2E0"

// Verificar se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL ou Anon Key não definidos nas variáveis de ambiente")
}

let supabaseClient: any = null

// Função para obter o cliente Supabase
export const getSupabase = (forceNew = false) => {
  // Se já temos um cliente e não estamos forçando uma nova instância, retorná-lo
  if (supabaseClient && !forceNew) {
    return supabaseClient
  }

  // Verificar se as credenciais estão disponíveis
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== "undefined") {
      console.warn("Supabase URL ou Anon Key não definidos nas variáveis de ambiente")
    }
    return null
  }

  // Criar o cliente
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  })

  return supabaseClient
}

// Para compatibilidade com código existente
export const supabase = getSupabase()

// Função para verificar a conexão com o Supabase
export async function checkSupabaseConnection() {
  try {
    const client = getSupabase()
    if (!client) {
      return false
    }

    const { data, error } = await client.from("health_check").select("*").limit(1)

    if (error) {
      console.error("Erro ao verificar conexão com Supabase:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Erro ao verificar conexão com Supabase:", error)
    return false
  }
}

export const isSupabaseConfigured = () => {
  return supabaseUrl !== "" && supabaseAnonKey !== ""
}

export const testSupabaseConnection = async () => {
  try {
    const client = getSupabase()
    if (!client) {
      return {
        success: false,
        message: "Credenciais do Supabase não encontradas. Verifique suas variáveis de ambiente.",
      }
    }

    const { data, error } = await client.from("health_check").select("*").limit(1)
    if (error) throw error
    return { success: true, message: "Conexão com Supabase estabelecida com sucesso!" }
  } catch (error: any) {
    console.error("Erro ao testar conexão com Supabase:", error)
    return {
      success: false,
      message: `Falha na conexão com Supabase: ${error.message || "Erro desconhecido"}`,
    }
  }
}

// Adicione esta função após a função testSupabaseConnection
export const clearSupabaseCache = () => {
  // Resetar o cliente Supabase para forçar uma nova conexão
  supabaseClient = null

  // Limpar qualquer cache local relacionado ao Supabase
  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key.startsWith("supabase.") || key.startsWith("sb-"))) {
      keysToRemove.push(key)
    }
  }

  // Remover as chaves em uma segunda passagem para evitar problemas com o índice
  keysToRemove.forEach((key) => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`Erro ao remover chave ${key} do localStorage:`, error)
    }
  })

  return true
}

