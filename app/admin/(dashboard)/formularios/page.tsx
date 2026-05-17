import { createClient } from '@/lib/supabase/server'
import { Formulario } from '@/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PlusCircle, Edit } from 'lucide-react'
import Link from 'next/link'

import { CopyLinkButton } from '@/components/admin/CopyLinkButton'
import { DeleteFormButton } from '@/components/admin/DeleteFormButton'

function getEstadoColor(estado: string) {
  switch (estado) {
    case 'borrador':
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    case 'enviado':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
    case 'en_progreso':
      return 'bg-amber-100 text-amber-800 hover:bg-amber-200'
    case 'completado':
      return 'bg-green-100 text-green-800 hover:bg-green-200'
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
  }
}

function getEstadoLabel(estado: string) {
  switch (estado) {
    case 'borrador':
      return 'Borrador'
    case 'enviado':
      return 'Publicado'
    case 'en_progreso':
      return 'En progreso'
    case 'completado':
      return 'Completado'
    default:
      return estado
  }
}

function calcularProgreso(form: any) {
  if (!form.bloques) return 0
  
  const allPreguntas = form.bloques.flatMap((b: any) => b.preguntas || [])
  const totalPreguntas = allPreguntas.length
  if (totalPreguntas === 0) return 0
  
  let answeredCount = 0
  allPreguntas.forEach((p: any) => {
    if (p.respuestas && p.respuestas.length > 0) {
      const r = p.respuestas[0]
      if (p.tipo === 'texto_largo' && r.valor_texto?.trim()) answeredCount++
      else if ((p.tipo === 'seleccion_unica' || p.tipo === 'seleccion_multiple') && r.valor_opciones?.length > 0) answeredCount++
      else if (p.tipo === 'archivo' && (r.archivo_url || (r.archivos && r.archivos.length > 0))) answeredCount++
    }
  })
  
  return Math.round((answeredCount / totalPreguntas) * 100)
}

export default async function FormulariosPage() {
  const supabase = await createClient()

  const { data: formularios, error } = await supabase
    .from('formularios')
    .select(`
      *,
      bloques (
        preguntas (
          id,
          tipo,
          respuestas (
            valor_texto,
            valor_opciones,
            archivo_url,
            archivos
          )
        )
      )
    `)
    .order('fecha_creacion', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Formularios</h1>
          <p className="text-gray-500 mt-1">
            Gestiona los diagnósticos y encuestas para tus clientes.
          </p>
        </div>
        <Link href="/admin/formularios/nuevo">
          <Button className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Nuevo formulario
          </Button>
        </Link>
      </div>

      {!formularios || formularios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-gray-200 rounded-lg bg-white">
          <div className="rounded-full bg-gray-100 p-3 mb-4">
            <PlusCircle className="h-6 w-6 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Ningún formulario creado</h3>
          <p className="text-gray-500 max-w-sm mb-6">
            Aún no has creado ningún formulario. Comienza creando el primero para enviarlo a tus clientes.
          </p>
          <Link href="/admin/formularios/nuevo">
            <Button>Crear mi primer formulario</Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-md border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead>Cliente</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Creación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formularios.map((form: Formulario) => (
                <TableRow key={form.id}>
                  <TableCell className="font-medium text-gray-900">{form.nombre_cliente}</TableCell>
                  <TableCell className="text-gray-600">{form.empresa_cliente}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={getEstadoColor(form.estado)}>
                      {getEstadoLabel(form.estado)}
                      {form.estado === 'en_progreso' && ` (${calcularProgreso(form)}%)`}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {new Intl.DateTimeFormat('es-AR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    }).format(new Date(form.fecha_creacion))}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(form.estado === 'completado' || form.estado === 'en_progreso') ? (
                        <Link href={`/admin/formularios/${form.id}/respuestas`}>
                          <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                            {form.estado === 'completado' ? 'Ver Resultados' : 'Ver Progreso'}
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/admin/formularios/${form.id}`}>
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                        </Link>
                      )}
                      
                      {form.estado !== 'borrador' && (
                        <CopyLinkButton id={form.id} />
                      )}
                      <DeleteFormButton id={form.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
