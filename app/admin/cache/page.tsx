import { CacheCleaner } from "@/components/cache-cleaner"

export default function CacheManagementPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Gerenciamento de Cache</h1>
      <p className="mb-6 text-gray-600">
        Esta página permite limpar o cache do aplicativo para resolver problemas de funcionamento sem precisar limpar
        todo o histórico do navegador.
      </p>
      <CacheCleaner />
    </div>
  )
}

