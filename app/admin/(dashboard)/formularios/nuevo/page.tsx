'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default function NuevoFormularioPage() {
  const router = useRouter()
  const [nombreCliente, setNombreCliente] = useState('')
  const [empresaCliente, setEmpresaCliente] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/formularios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre_cliente: nombreCliente,
          empresa_cliente: empresaCliente,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear el formulario')
      }

      const data = await response.json()
      // Redirigir al editor del formulario creado
      router.push(`/admin/formularios/${data.id}`)
    } catch (err: any) {
      setError(err.message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/formularios">
          <Button variant="outline" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Crear Formulario</h1>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Información del Cliente</CardTitle>
            <CardDescription>
              Ingresa los datos básicos para inicializar este diagnóstico o encuesta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre_cliente">Nombre del contacto</Label>
              <Input
                id="nombre_cliente"
                placeholder="Ej. María López"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa_cliente">Nombre de la empresa</Label>
              <Input
                id="empresa_cliente"
                placeholder="Ej. Acme Corp"
                value={empresaCliente}
                onChange={(e) => setEmpresaCliente(e.target.value)}
                required
              />
            </div>
            
            {error && (
              <p className="text-sm font-medium text-red-500">{error}</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-3 border-t bg-gray-50 p-6">
            <Link href="/admin/formularios">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creando...' : 'Crear y continuar'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
