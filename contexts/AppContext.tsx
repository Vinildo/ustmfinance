"use client"

import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react"
import { v4 as uuidv4 } from "uuid"
import type { Fornecedor, Pagamento } from "@/types/fornecedor"
import type { User } from "@/types/user"
import type { Receita } from "@/types/receita"
import type { FundoManejo } from "@/types/fundo-manejo"
import type { Notification, WorkflowConfig } from "@/types/workflow"
import { DEFAULT_ROLE_PERMISSIONS, PREDEFINED_PERMISSION_GROUPS, type PermissionType } from "@/types/permission"
import type { ReactNode } from "react"
// Adicionar importações dos serviços
import { UserService } from "@/services/user-service"
import { FornecedorService } from "@/services/fornecedor-service"
import { PagamentoService } from "@/services/pagamento-service"
import { ReceitaService } from "@/services/receita-service"
import { NotificationService } from "@/services/notification-service"
import { getSupabase } from "@/lib/supabase" // Corrigido o caminho de importação

// Definir tipos para o contexto
interface AppContextType {
  fornecedores: Fornecedor[]
  addFornecedor: (fornecedor: Omit<Fornecedor, "id">) => Promise<Fornecedor>
  updateFornecedor: (fornecedor: Fornecedor) => Promise<Fornecedor>
  deleteFornecedor: (id: string) => Promise<boolean>
  addPagamento: (fornecedorId: string, pagamento: Omit<Pagamento, "id">) => Promise<Pagamento>
  updatePagamento: (fornecedorId: string, pagamento: Pagamento) => Promise<Pagamento>
  deletePagamento: (fornecedorId: string, pagamentoId: string) => Promise<boolean>
  users: User[]
  addUser: (user: Omit<User, "id" | "isActive" | "forcePasswordChange"> | User) => Promise<User>
  updateUser: (user: User) => Promise<User>
  deleteUser: (id: string) => Promise<boolean>
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  login: (username: string, password: string) => Promise<User | null>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
  fundosManejo: FundoManejo[]
  addFundoManeio: (fundo: Omit<FundoManejo, "id">) => FundoManejo
  updateFundoManeio: (fundo: FundoManejo) => void
  deleteFundoManeio: (id: string) => void
  receitas: Receita[]
  addReceita: (receita: Omit<Receita, "id">) => Promise<Receita>
  updateReceita: (receita: Receita) => Promise<Receita>
  deleteReceita: (id: string) => Promise<boolean>
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, "id" | "date" | "read">) => Promise<Notification>
  markNotificationAsRead: (id: string) => Promise<boolean>
  deleteNotification: (id: string) => Promise<boolean>
  workflowConfig: WorkflowConfig
  updateWorkflowConfig: (config: WorkflowConfig) => void
  initializeWorkflow: (pagamentoId: string, fornecedorId: string) => void
  syncUsersWithSupabase: () => Promise<boolean>
  clearContextCache: () => Promise<boolean>
}

// Criar o contexto
const AppContext = createContext<AppContextType | undefined>(undefined)

// Função para carregar dados do localStorage com tratamento de erros
function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const storedValue = localStorage.getItem(key)
      if (storedValue) {
        return JSON.parse(storedValue)
      }
    }
  } catch (error) {
    console.error(`Erro ao carregar ${key} do localStorage:`, error)
  }
  return defaultValue
}

// Função para salvar dados no localStorage com tratamento de erros
function saveToLocalStorage(key: string, value: any) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(key, JSON.stringify(value))
    }
  } catch (error) {
    console.error(`Erro ao salvar ${key} no localStorage:`, error)
  }
}

// Verificar se estamos no lado do cliente
const isBrowser = typeof window !== "undefined"

// Criar o provedor do contexto
export function AppProvider({ children }: { children: ReactNode }) {
  // Ref para controlar a inicialização
  const initialized = useRef(false)

  // Carregar dados do localStorage apenas uma vez na inicialização
  const initialFornecedores = useRef<Fornecedor[]>([])
  const initialUsers = useRef<User[]>([])
  const initialFundosManejo = useRef<FundoManejo[]>([])
  const initialReceitas = useRef<Receita[]>([])
  const initialNotifications = useRef<Notification[]>([])
  const initialWorkflowConfig = useRef<WorkflowConfig>({
    enabled: true,
    steps: [
      { role: "financial_director", username: "diretora.financeira", title: "Diretora Financeira" },
      { role: "rector", username: "reitor", title: "Reitor" },
    ],
  })
  const initialCurrentUser = useRef<User | null>(null)

  // Inicializar dados apenas uma vez
  if (!initialized.current) {
    // Carregar fornecedores
    initialFornecedores.current = loadFromLocalStorage<Fornecedor[]>("fornecedores", [])

    // Carregar usuários
    const storedUsers = loadFromLocalStorage<User[]>("users", [])
    if (storedUsers.length > 0) {
      initialUsers.current = storedUsers
    } else {
      // Criar usuários padrão se não existirem
      initialUsers.current = [
        {
          id: "1",
          username: "admin",
          password: "admin",
          fullName: "Administrador",
          email: "admin@example.com",
          role: "admin",
          isActive: true,
          forcePasswordChange: false,
        },
        {
          id: "2",
          username: "diretora.financeira",
          password: "123456",
          fullName: "Diretora Financeira",
          email: "diretora@example.com",
          role: "financial_director",
          isActive: true,
          forcePasswordChange: false,
        },
        {
          id: "3",
          username: "reitor",
          password: "123456",
          fullName: "Reitor",
          email: "reitor@example.com",
          role: "rector",
          isActive: true,
          forcePasswordChange: false,
        },
        {
          id: "4",
          username: "Vinildo Mondlane",
          fullName: "Vinildo Mondlane",
          email: "v.mondlane1@gmail.com",
          role: "admin",
          password: "Vinildo123456",
          isActive: true,
          forcePasswordChange: false,
        },
      ]
      saveToLocalStorage("users", initialUsers.current)
    }

    // Carregar usuário atual (após a verificação do lado do cliente)
    try {
      const storedCurrentUser = isBrowser ? localStorage.getItem("currentUser") : null
      if (storedCurrentUser) {
        initialCurrentUser.current = JSON.parse(storedCurrentUser)
      }
    } catch (error) {
      console.error("Erro ao carregar usuário atual:", error)
    }

    // Carregar fundos de manejo (após a verificação do lado do cliente)
    initialFundosManejo.current = loadFromLocalStorage<FundoManejo[]>("fundosManejo", [])

    // Carregar receitas
    initialReceitas.current = loadFromLocalStorage<Receita[]>("receitas", [])

    // Carregar notificações
    initialNotifications.current = loadFromLocalStorage<Notification[]>("notifications", [])

    // Carregar configuração de workflow
    const storedWorkflowConfig = loadFromLocalStorage<WorkflowConfig | null>("workflowConfig", null)
    if (storedWorkflowConfig) {
      initialWorkflowConfig.current = storedWorkflowConfig
    }

    // Marcar como inicializado
    initialized.current = true
  }

  // Estado para fornecedores - inicializado apenas uma vez
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(initialFornecedores.current)
  // Estado para usuários - inicializado apenas uma vez
  const [users, setUsers] = useState<User[]>(initialUsers.current)
  // Estado para o usuário atual - inicializado apenas uma vez
  const [currentUser, setCurrentUser] = useState<User | null>(initialCurrentUser.current)
  // Estado para fundos de manejo - inicializado apenas uma vez (após a verificação do lado do cliente)
  const [fundosManejo, setFundosManejo] = useState<FundoManejo[]>(initialFundosManejo.current)
  // Estado para receitas - inicializado apenas uma vez
  const [receitas, setReceitas] = useState<Receita[]>(initialReceitas.current)
  // Estado para notificações - inicializado apenas uma vez
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications.current)
  // Estado para configuração de workflow - inicializado apenas uma vez
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig>(initialWorkflowConfig.current)
  // Estado para controlar o loading
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Ref para controlar atualizações do localStorage
  const pendingUpdates = useRef<Record<string, boolean>>({})

  // Função para agendar uma atualização do localStorage (com verificação do lado do cliente)
  const scheduleUpdate = useCallback((key: string, value: any) => {
    if (!pendingUpdates.current[key]) {
      pendingUpdates.current[key] = true
      setTimeout(() => {
        saveToLocalStorage(key, value)
        pendingUpdates.current[key] = false
      }, 500) // Debounce de 500ms
    }
  }, [])

  // Salvar fornecedores no localStorage quando mudar
  useEffect(() => {
    // (com verificação do lado do cliente)
    if (fornecedores.length > 0 && isBrowser) {
      scheduleUpdate("fornecedores", fornecedores)
    }
  }, [fornecedores, scheduleUpdate])

  // Salvar usuários no localStorage quando mudar
  useEffect(() => {
    if (users.length > 0 && isBrowser) {
      scheduleUpdate("users", users)
    }
  }, [users, scheduleUpdate])

  // Salvar usuário atual no localStorage quando mudar
  useEffect(() => {
    if (currentUser && isBrowser) {
      scheduleUpdate("currentUser", currentUser)
    } else {
      try {
        localStorage.removeItem("currentUser")
      } catch (error) {
        console.error("Erro ao remover usuário atual do localStorage:", error)
      }
    }
  }, [currentUser, scheduleUpdate])

  // Salvar fundos de manejo no localStorage quando mudar
  useEffect(() => {
    // (com verificação do lado do cliente)
    if (fundosManejo.length > 0 && isBrowser) {
      scheduleUpdate("fundosManejo", fundosManejo)
    }
  }, [fundosManejo, scheduleUpdate])

  // Salvar receitas no localStorage quando mudar
  useEffect(() => {
    // (com verificação do lado do cliente)
    if (receitas.length > 0 && isBrowser) {
      scheduleUpdate("receitas", receitas)
    }
  }, [receitas, scheduleUpdate])

  // Salvar notificações no localStorage quando mudar
  useEffect(() => {
    if (isBrowser) {
      scheduleUpdate("notifications", notifications)
    }
  }, [notifications, scheduleUpdate])

  // Salvar configuração de workflow no localStorage quando mudar
  useEffect(() => {
    if (isBrowser) {
      scheduleUpdate("workflowConfig", workflowConfig) // (com verificação do lado do cliente)
    }
  }, [workflowConfig, scheduleUpdate])

  // Inicializar workflow - define this BEFORE addPagamento
  const initializeWorkflow = useCallback(
    (pagamentoId: string, fornecedorId: string) => {
      if (!workflowConfig.enabled) return

      setFornecedores((prev) => {
        const fornecedor = prev.find((f) => f.id === fornecedorId)
        if (!fornecedor) return prev

        const pagamento = fornecedor.pagamentos.find((p) => p.id === pagamentoId)
        if (!pagamento) return prev

        // Criar os passos do workflow
        const workflowSteps = workflowConfig.steps.map((step, index) => ({
          id: `step-${Date.now()}-${index}`,
          role: step.role,
          username: step.username,
          status: "pending" as "pending" | "approved" | "rejected",
        }))

        // Atualizar o pagamento com o workflow
        const updatedPagamento = {
          ...pagamento,
          workflow: {
            status: "in_progress",
            currentStep: 0,
            steps: workflowSteps,
          },
        }

        // Atualizar o fornecedor com o pagamento atualizado
        const updatedFornecedor = {
          ...fornecedor,
          pagamentos: fornecedor.pagamentos.map((p) => (p.id === pagamentoId ? updatedPagamento : p)),
        }

        // Retornar a lista atualizada de fornecedores
        return prev.map((f) => (f.id === fornecedorId ? updatedFornecedor : f))
      })

      // Enviar notificações para o primeiro aprovador
      if (workflowConfig.steps.length > 0) {
        const firstApprover = workflowConfig.steps[0]
        const notificationData = {
          userId: firstApprover.username,
          title: "Pagamento aguardando aprovação",
          message: `O pagamento ${pagamentoId} aguarda sua aprovação.`,
          type: "payment_approval" as const,
          relatedId: pagamentoId,
          actionUrl: `/dashboard?tab=workflow`,
        }

        setNotifications((prev) => {
          const newNotification = {
            ...notificationData,
            id: uuidv4(),
            date: new Date(),
            read: false,
          }
          return [newNotification, ...prev]
        })
      }
    },
    [workflowConfig, setNotifications],
  )

  // Adicionar fornecedor
  const addFornecedor = useCallback(async (fornecedor: Omit<Fornecedor, "id">) => {
    try {
      console.log("[AppContext] Adicionando fornecedor:", fornecedor)

      const newFornecedor: Fornecedor = {
        ...fornecedor,
        id: uuidv4(), // Sempre gerar um novo UUID válido
        nome: fornecedor.nome || "Fornecedor Sem Nome",
        pagamentos: fornecedor.pagamentos || [],
      }

      // Adicionar fornecedor no serviço
      const addedFornecedor = await FornecedorService.addFornecedor(newFornecedor)

      // Atualizar estado local
      setFornecedores((prev) => {
        // Verificar se o fornecedor já existe
        if (prev.some((f) => f.id === addedFornecedor.id)) {
          console.log(`[AppContext] Fornecedor com ID ${addedFornecedor.id} já existe no estado`)
          return prev.map((f) => (f.id === addedFornecedor.id ? addedFornecedor : f))
        }

        console.log(`[AppContext] Adicionando fornecedor ao estado:`, addedFornecedor)
        return [...prev, addedFornecedor]
      })

      return addedFornecedor
    } catch (error) {
      console.error("[AppContext] Erro ao adicionar fornecedor:", error)
      throw error
    }
  }, [])

  // Adicionar pagamento - now this can use initializeWorkflow
  const addPagamento = useCallback(
    async (fornecedorId: string, pagamento: Omit<Pagamento, "id">) => {
      try {
        console.log("[AppContext] Iniciando addPagamento...")
        console.log("[AppContext] fornecedorId:", fornecedorId)
        console.log("[AppContext] pagamento:", pagamento)

        // Verificar se o fornecedorId é uma string válida
        if (!fornecedorId || typeof fornecedorId !== "string") {
          console.error("[AppContext] ID do fornecedor inválido:", fornecedorId)
          throw new Error("ID do fornecedor inválido")
        }

        // Criar o pagamento com ID UUID
        const newPagamento: Pagamento = {
          ...pagamento,
          id: pagamento.id || uuidv4(), // Usar UUID em vez de string personalizada
        }
        console.log("[AppContext] Novo pagamento criado:", newPagamento)

        // Verificar se o fornecedor existe antes de adicionar o pagamento
        let fornecedorExists = false
        const fornecedorAtual = fornecedores.find((f) => f.id === fornecedorId)
        fornecedorExists = !!fornecedorAtual
        console.log("[AppContext] Fornecedor existe?", fornecedorExists)

        // Se o fornecedor não existir, criar um novo
        if (!fornecedorExists) {
          console.log("[AppContext] Fornecedor não existe, criando novo...")
          // Buscar o nome do fornecedor a partir do pagamento
          const fornecedorNome = pagamento.fornecedorNome || "Fornecedor Sem Nome"

          // Criar um novo fornecedor
          const novoFornecedor: Fornecedor = {
            id: fornecedorId,
            nome: fornecedorNome,
            pagamentos: [],
          }

          // Adicionar o fornecedor
          await addFornecedor(novoFornecedor)
          console.log("[AppContext] Novo fornecedor adicionado:", novoFornecedor)
        }

        console.log("[AppContext] Tentando adicionar pagamento:", newPagamento)

        // Adicionar pagamento no serviço
        try {
          // Verificar se o serviço está disponível
          if (!PagamentoService || typeof PagamentoService.addPagamento !== "function") {
            console.error("[AppContext] PagamentoService não disponível ou método addPagamento não é uma função")
            throw new Error("Serviço de pagamento não disponível")
          }

          const result = await PagamentoService.addPagamento(fornecedorId, newPagamento)
          console.log("[AppContext] Resultado do PagamentoService:", result)

          if (result.error) {
            throw result.error
          }

          const addedPagamento = result.data || newPagamento
          const newPagamentoId = addedPagamento.id

          // Atualizar o estado dos fornecedores - APENAS UMA VEZ
          setFornecedores((prev) => {
            console.log("[AppContext] Atualizando estado dos fornecedores...")
            // Verificar se o fornecedor existe
            const fornecedorIndex = prev.findIndex((f) => f.id === fornecedorId)

            if (fornecedorIndex === -1) {
              console.warn(
                `[AppContext] Fornecedor com ID ${fornecedorId} não encontrado. Isso não deveria acontecer após a verificação.`,
              )
              return prev
            }

            // Se o fornecedor existir, adicionar o pagamento
            const updatedFornecedores = [...prev]
            const fornecedor = { ...updatedFornecedores[fornecedorIndex] }

            // Verificar se o pagamento já existe para evitar duplicação
            const pagamentoExistente = fornecedor.pagamentos.find((p) => p.id === addedPagamento.id)
            if (pagamentoExistente) {
              console.log(`[AppContext] Pagamento ${addedPagamento.id} já existe, evitando duplicação`)
              return prev
            }

            fornecedor.pagamentos = [...fornecedor.pagamentos, addedPagamento]
            updatedFornecedores[fornecedorIndex] = fornecedor

            console.log("[AppContext] Estado dos fornecedores atualizado com sucesso")
            return updatedFornecedores
          })

          console.log(`[AppContext] Pagamento ${newPagamentoId} adicionado ao fornecedor ${fornecedorId}`)

          // Inicializar workflow se estiver habilitado (com um pequeno atraso)
          if (workflowConfig.enabled) {
            setTimeout(() => {
              console.log("[AppContext] Inicializando workflow para o pagamento:", newPagamentoId)
              initializeWorkflow(newPagamentoId, fornecedorId)
            }, 300)
          }

          return addedPagamento
        } catch (error) {
          console.error("[AppContext] Erro ao adicionar pagamento ao serviço:", error)

          // Fallback para adicionar apenas no estado local se falhar no serviço
          console.log("[AppContext] Usando fallback para adicionar pagamento localmente...")
          setFornecedores((prev) => {
            const fornecedorIndex = prev.findIndex((f) => f.id === fornecedorId)
            if (fornecedorIndex === -1) return prev

            const updatedFornecedores = [...prev]
            const fornecedor = { ...updatedFornecedores[fornecedorIndex] }
            fornecedor.pagamentos = [...fornecedor.pagamentos, newPagamento]
            updatedFornecedores[fornecedorIndex] = fornecedor

            return updatedFornecedores
          })

          return newPagamento
        }
      } catch (error) {
        console.error("[AppContext] Erro geral ao adicionar pagamento:", error)
        throw error
      }
    },
    [workflowConfig.enabled, initializeWorkflow, fornecedores, addFornecedor],
  )

  // Atualizar pagamento
  const updatePagamento = useCallback(async (fornecedorId: string, pagamento: Pagamento) => {
    try {
      // Atualizar pagamento no Supabase
      const result = await PagamentoService.updatePagamento(fornecedorId, pagamento)
      if (result.error) {
        throw result.error
      }

      const updatedPagamento = result.data

      // Atualizar estado local
      setFornecedores((prev) =>
        prev.map((f) =>
          f.id === fornecedorId
            ? { ...f, pagamentos: f.pagamentos.map((p) => (p.id === updatedPagamento.id ? updatedPagamento : p)) }
            : f,
        ),
      )
      return updatedPagamento
    } catch (error) {
      console.error("Erro ao atualizar pagamento:", error)
      throw error
    }
  }, [])

  // Excluir pagamento
  const deletePagamento = useCallback(
    async (fornecedorId: string, pagamentoId: string) => {
      try {
        // Verificar se o pagamento já existe no estado atual
        const fornecedor = fornecedores.find((f) => f.id === fornecedorId)
        const pagamentoExiste = fornecedor?.pagamentos.some((p) => p.id === pagamentoId)

        if (!pagamentoExiste) {
          console.log(`Pagamento ${pagamentoId} não encontrado, evitando operação duplicada`)
          return true
        }

        // Excluir pagamento no Supabase
        const result = await PagamentoService.deletePagamento(pagamentoId)
        if (result.error) {
          throw result.error
        }

        // Atualizar estado local
        setFornecedores((prev) =>
          prev.map((f) =>
            f.id === fornecedorId ? { ...f, pagamentos: f.pagamentos.filter((p) => p.id !== pagamentoId) } : f,
          ),
        )
        return true
      } catch (error) {
        console.error("Erro ao excluir pagamento:", error)
        throw error
      }
    },
    [fornecedores],
  )

  // Atualizar fornecedor
  const updateFornecedor = useCallback(async (fornecedor: Fornecedor) => {
    try {
      // Atualizar fornecedor no Supabase
      const updatedFornecedor = await FornecedorService.updateFornecedor(fornecedor)

      // Atualizar estado local
      setFornecedores((prev) => prev.map((f) => (f.id === updatedFornecedor.id ? updatedFornecedor : f)))
      return updatedFornecedor
    } catch (error) {
      console.error("Erro ao atualizar fornecedor:", error)
      throw error
    }
  }, [])

  // Excluir fornecedor
  const deleteFornecedor = useCallback(async (id: string) => {
    try {
      // Excluir fornecedor no Supabase
      await FornecedorService.deleteFornecedor(id)

      // Atualizar estado local
      setFornecedores((prev) => prev.filter((f) => f.id !== id))
      return true
    } catch (error) {
      console.error("Erro ao excluir fornecedor:", error)
      throw error
    }
  }, [])

  // Adicionar usuário
  const addUser = useCallback(async (user: Omit<User, "id" | "isActive" | "forcePasswordChange"> | User) => {
    try {
      // Verificar se o usuário já tem um ID (usuário completo)
      const newUser: User =
        "id" in user
          ? (user as User)
          : {
              ...user,
              id: uuidv4(),
              isActive: true,
              forcePasswordChange: true,
            }

      // Adicionar usuário no Supabase
      const addedUser = await UserService.addUser(newUser)

      // Atualizar estado local
      setUsers((prev) => {
        if (prev.some((u) => u.id === addedUser.id)) {
          console.log(`Usuário com ID ${addedUser.id} já existe.`)
          return prev
        }

        return [...prev, addedUser]
      })

      return addedUser
    } catch (error) {
      console.error("Erro ao adicionar usuário:", error)
      throw error
    }
  }, [])

  // Atualizar usuário
  const updateUser = useCallback(async (user: User) => {
    try {
      // Atualizar usuário no Supabase
      const updatedUser = await UserService.updateUser(user)

      // Atualizar estado local
      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)))
      return updatedUser
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error)
      throw error
    }
  }, [])

  // Excluir usuário
  const deleteUser = useCallback(
    async (id: string) => {
      try {
        // Verificar se o usuário existe
        const userToDelete = users.find((u) => u.id === id)
        if (!userToDelete) {
          throw new Error(`Usuário com ID ${id} não encontrado`)
        }

        // Verificar se não estamos excluindo o usuário atual
        if (currentUser && currentUser.id === id) {
          throw new Error("Não é possível excluir o usuário atualmente logado")
        }

        // Excluir usuário no Supabase
        await UserService.deleteUser(id)

        // Atualizar estado local
        setUsers((prev) => prev.filter((u) => u.id !== id))

        return true
      } catch (error) {
        console.error("Erro ao excluir usuário:", error)
        throw error
      }
    },
    [currentUser, users],
  )

  // Login
  const login = useCallback(async (username: string, password: string) => {
    try {
      // Usar o serviço de autenticação do Supabase
      const user = await UserService.login(username, password)

      if (user) {
        setCurrentUser(user)
        return user
      }

      return null
    } catch (error) {
      console.error("Erro no login:", error)
      throw error
    }
  }, [])

  // Logout
  const logout = useCallback(async () => {
    try {
      await UserService.logout()
      setCurrentUser(null)
    } catch (error) {
      console.error("Erro no logout:", error)
      throw error
    }
  }, [])

  // Verificar permissão
  const hasPermission = useCallback(
    (permission: string) => {
      if (!currentUser) return false

      // Administradores têm todas as permissões
      if (currentUser.role === "admin") return true

      // Verificar permissões baseadas em função (role)
      const rolePermissions = DEFAULT_ROLE_PERMISSIONS[currentUser.role] || []
      if (rolePermissions.includes(permission as PermissionType)) return true

      // Verificar permissões individuais
      if (currentUser.permissions?.includes(permission as PermissionType)) return true

      // Verificar permissões de grupos
      if (currentUser.permissionGroups) {
        for (const groupId of currentUser.permissionGroups) {
          const group = PREDEFINED_PERMISSION_GROUPS.find((g) => g.id === groupId)
          if (group && group.permissions.includes(permission as PermissionType)) {
            return true
          }
        }
      }

      return false
    },
    [currentUser],
  )

  // Adicionar fundo de manejo
  const addFundoManeio = useCallback((fundo: Omit<FundoManejo, "id">) => {
    const newFundo: FundoManejo = {
      ...fundo,
      id: uuidv4(),
    }
    setFundosManejo((prev) => [...prev, newFundo])
    return newFundo
  }, [])

  // Atualizar fundo de manejo
  const updateFundoManeio = useCallback((fundo: FundoManejo) => {
    setFundosManejo((prev) => prev.map((f) => (f.id === fundo.id ? fundo : f)))
  }, [])

  // Excluir fundo de manejo
  const deleteFundoManeio = useCallback((id: string) => {
    setFundosManejo((prev) => prev.filter((f) => f.id !== id))
  }, [])

  // Adicionar receita
  const addReceita = useCallback(async (receita: Omit<Receita, "id">) => {
    try {
      const newReceita: Receita = {
        ...receita,
        id: uuidv4(),
      }

      // Adicionar receita no Supabase
      const addedReceita = await ReceitaService.addReceita(newReceita)

      // Atualizar estado local
      setReceitas((prev) => [...prev, addedReceita])
      return addedReceita
    } catch (error) {
      console.error("Erro ao adicionar receita:", error)
      throw error
    }
  }, [])

  // Atualizar receita
  const updateReceita = useCallback(async (receita: Receita) => {
    try {
      // Atualizar receita no Supabase
      const updatedReceita = await ReceitaService.updateReceita(receita)

      // Atualizar estado local
      setReceitas((prev) => prev.map((r) => (r.id === updatedReceita.id ? updatedReceita : r)))
      return updatedReceita
    } catch (error) {
      console.error("Erro ao atualizar receita:", error)
      throw error
    }
  }, [])

  // Excluir receita
  const deleteReceita = useCallback(async (id: string) => {
    try {
      // Excluir receita no Supabase
      await ReceitaService.deleteReceita(id)

      // Atualizar estado local
      setReceitas((prev) => prev.filter((r) => r.id !== id))
      return true
    } catch (error) {
      console.error("Erro ao excluir receita:", error)
      throw error
    }
  }, [])

  // Adicionar notificação
  const addNotification = useCallback(async (notification: Omit<Notification, "id" | "date" | "read">) => {
    try {
      const newNotification: Notification = {
        ...notification,
        id: uuidv4(),
        date: new Date(),
        read: false,
      }

      // Adicionar notificação no Supabase
      const addedNotification = await NotificationService.addNotification(newNotification)

      // Atualizar estado local
      setNotifications((prev) => [addedNotification, ...prev])
      return addedNotification
    } catch (error) {
      console.error("Erro ao adicionar notificação:", error)
      throw error
    }
  }, [])

  // Marcar notificação como lida
  const markNotificationAsRead = useCallback(async (id: string) => {
    try {
      // Marcar notificação como lida no Supabase
      await NotificationService.markNotificationAsRead(id)

      // Atualizar estado local
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      return true
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error)
      throw error
    }
  }, [])

  // Excluir notificação
  const deleteNotification = useCallback(async (id: string) => {
    try {
      // Excluir notificação no Supabase
      await NotificationService.deleteNotification(id)

      // Atualizar estado local
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      return true
    } catch (error) {
      console.error("Erro ao excluir notificação:", error)
      throw error
    }
  }, [])

  // Atualizar configuração de workflow
  const updateWorkflowConfig = useCallback((config: WorkflowConfig) => {
    setWorkflowConfig(config)
  }, [])

  // Sincronizar usuários com Supabase
  const syncUsersWithSupabase = useCallback(async () => {
    try {
      // Obter todos os usuários do Supabase
      const supabaseUsers = await UserService.getAllUsers()

      // Atualizar o estado local com os usuários do Supabase
      setUsers(supabaseUsers)

      return true
    } catch (error) {
      console.error("Erro ao sincronizar usuários com Supabase:", error)
      return false
    }
  }, [])

  // Adicione esta função dentro do AppProvider, antes do return
  const clearContextCache = useCallback(async () => {
    try {
      // Obter uma nova instância do cliente Supabase
      const supabase = getSupabase(true)
      if (!supabase) {
        throw new Error("Não foi possível inicializar o cliente Supabase")
      }

      // Carregar usuários
      const supabaseUsers = await UserService.getAllUsers()
      setUsers(supabaseUsers)

      // Carregar fornecedores
      const supabseFornecedores = await FornecedorService.getAllFornecedores()
      setFornecedores(supabseFornecedores)

      // Carregar receitas
      const supabaseReceitas = await ReceitaService.getAllReceitas()
      setReceitas(supabaseReceitas)

      // Carregar notificações
      const supabaseNotifications = await NotificationService.getAllNotifications()
      setNotifications(supabaseNotifications)

      return true
    } catch (error) {
      console.error("Erro ao recarregar dados do Supabase:", error)
      return false
    }
  }, [])

  // Retornar o contexto
  const contextValue = useMemo(
    () => ({
      fornecedores,
      addFornecedor,
      updateFornecedor,
      deleteFornecedor,
      addPagamento,
      updatePagamento,
      deletePagamento,
      users,
      addUser,
      updateUser,
      deleteUser,
      currentUser,
      setCurrentUser,
      login,
      logout,
      hasPermission,
      fundosManejo,
      addFundoManeio,
      updateFundoManeio,
      deleteFundoManeio,
      receitas,
      addReceita,
      updateReceita,
      deleteReceita,
      notifications,
      addNotification,
      markNotificationAsRead,
      deleteNotification,
      workflowConfig,
      updateWorkflowConfig,
      initializeWorkflow,
      syncUsersWithSupabase,
      clearContextCache,
    }),
    [
      fornecedores,
      addFornecedor,
      updateFornecedor,
      deleteFornecedor,
      addPagamento,
      updatePagamento,
      deletePagamento,
      users,
      addUser,
      updateUser,
      deleteUser,
      currentUser,
      setCurrentUser,
      login,
      logout,
      hasPermission,
      fundosManejo,
      addFundoManeio,
      updateFundoManeio,
      deleteFundoManeio,
      receitas,
      addReceita,
      updateReceita,
      deleteReceita,
      notifications,
      addNotification,
      markNotificationAsRead,
      deleteNotification,
      workflowConfig,
      updateWorkflowConfig,
      initializeWorkflow,
      syncUsersWithSupabase,
      clearContextCache,
    ],
  )

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider> // (com verificação do lado do cliente)
}

// Hook para usar o contexto
export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("useAppContext deve ser usado dentro de um AppProvider")
  }
  return context
}

