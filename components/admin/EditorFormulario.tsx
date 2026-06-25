'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { GripVertical, PlusCircle, Save, Send, Trash2 } from 'lucide-react'
import { BloqueEditorPayload, PreguntaEditorPayload } from '@/types'
import { AIGeneratorModal } from './AIGeneratorModal'

// ─── Sortable Pregunta ───────────────────────────────────────────────────────

interface SortablePreguntaProps {
  pregunta: PreguntaEditorPayload
  pIndex: number
  bloqueId: string
  onUpdate: (bloqueId: string, preguntaId: string, updates: Partial<PreguntaEditorPayload>) => void
  onRemove: (bloqueId: string, preguntaId: string) => void
}

function SortablePregunta({ pregunta, pIndex, bloqueId, onUpdate, onRemove }: SortablePreguntaProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pregunta.id as string,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex gap-4 p-5 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-50 items-start relative transition-all group shadow-sm"
    >
      <div className="absolute -left-3 -top-3 w-7 h-7 bg-white shadow-sm border border-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs font-bold z-10">
        {pIndex + 1}
      </div>

      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 touch-none"
        tabIndex={-1}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex-1 space-y-5 pt-1">
        <Input
          value={pregunta.texto}
          onChange={(e) => onUpdate(bloqueId, pregunta.id as string, { texto: e.target.value })}
          placeholder="Escribe la pregunta aquí..."
          className="bg-white font-medium text-gray-900 border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />

        <div className="flex flex-wrap gap-4 items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-gray-500 mb-1.5 block">Tipo de respuesta</Label>
            <select
              className="flex h-9 w-full items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              value={pregunta.tipo}
              onChange={(e) =>
                onUpdate(bloqueId, pregunta.id as string, { tipo: e.target.value as PreguntaEditorPayload['tipo'] })
              }
            >
              <option value="texto_largo">Texto Largo</option>
              <option value="seleccion_unica">Selección Única</option>
              <option value="seleccion_multiple">Selección Múltiple</option>
              <option value="archivo">Subir Archivo</option>
            </select>
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={pregunta.obligatoria}
                onChange={(e) =>
                  onUpdate(bloqueId, pregunta.id as string, { obligatoria: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Respuesta Obligatoria
            </label>
          </div>
        </div>

        {(pregunta.tipo === 'seleccion_unica' || pregunta.tipo === 'seleccion_multiple') && (
          <div className="space-y-2 pl-4 border-l-2 border-indigo-200">
            <Label className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Opciones</Label>
            <Input
              value={pregunta.opciones?.join(', ') || ''}
              onChange={(e) =>
                onUpdate(bloqueId, pregunta.id as string, {
                  opciones: e.target.value.split(',').map((s) => s.trim()),
                })
              }
              placeholder="Opción 1, Opción 2, Opción 3 (separadas por coma)"
              className="bg-white shadow-sm focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-4"
        onClick={() => onRemove(bloqueId, pregunta.id as string)}
      >
        <Trash2 className="h-5 w-5" />
      </Button>
    </div>
  )
}

// ─── Sortable Bloque ─────────────────────────────────────────────────────────

interface SortableBloqueProps {
  bloque: BloqueEditorPayload
  bIndex: number
  onUpdateBloque: (bloqueId: string, updates: Partial<BloqueEditorPayload>) => void
  onRemoveBloque: (bloqueId: string) => void
  onAddPregunta: (bloqueId: string) => void
  onUpdatePregunta: (bloqueId: string, preguntaId: string, updates: Partial<PreguntaEditorPayload>) => void
  onRemovePregunta: (bloqueId: string, preguntaId: string) => void
  onReorderPreguntas: (bloqueId: string, oldIndex: number, newIndex: number) => void
}

function SortableBloque({
  bloque,
  bIndex,
  onUpdateBloque,
  onRemoveBloque,
  onAddPregunta,
  onUpdatePregunta,
  onRemovePregunta,
  onReorderPreguntas,
}: SortableBloqueProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bloque.id as string,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const preguntaSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handlePreguntaDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = bloque.preguntas.findIndex((p) => p.id === active.id)
    const newIndex = bloque.preguntas.findIndex((p) => p.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorderPreguntas(bloque.id as string, oldIndex, newIndex)
    }
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="shadow-md border-gray-200 border-t-4 border-t-indigo-600 overflow-hidden">
        <div className="bg-gray-50/80 p-6 border-b border-gray-100 flex justify-between items-start gap-4">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              {/* Drag handle for bloque */}
              <button
                {...attributes}
                {...listeners}
                className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
                tabIndex={-1}
              >
                <GripVertical className="h-5 w-5" />
              </button>
              <span className="flex items-center justify-center bg-indigo-100 text-indigo-700 font-bold rounded-full w-8 h-8 text-sm shadow-sm">
                {bIndex + 1}
              </span>
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sección / Bloque</Label>
            </div>
            <Input
              value={bloque.titulo}
              onChange={(e) => onUpdateBloque(bloque.id as string, { titulo: e.target.value })}
              className="font-bold text-xl bg-white border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm"
              placeholder="Título del bloque"
            />
            <Input
              value={bloque.descripcion || ''}
              onChange={(e) => onUpdateBloque(bloque.id as string, { descripcion: e.target.value })}
              className="text-sm bg-white border-gray-200 focus:border-indigo-500 shadow-sm"
              placeholder="Descripción breve (opcional)"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
            onClick={() => onRemoveBloque(bloque.id as string)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <CardContent className="p-6 space-y-6 bg-white">
          <DndContext sensors={preguntaSensors} collisionDetection={closestCenter} onDragEnd={handlePreguntaDragEnd}>
            <SortableContext
              items={bloque.preguntas.map((p) => p.id as string)}
              strategy={verticalListSortingStrategy}
            >
              {bloque.preguntas.map((pregunta, pIndex) => (
                <SortablePregunta
                  key={pregunta.id}
                  pregunta={pregunta}
                  pIndex={pIndex}
                  bloqueId={bloque.id as string}
                  onUpdate={onUpdatePregunta}
                  onRemove={onRemovePregunta}
                />
              ))}
            </SortableContext>
          </DndContext>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddPregunta(bloque.id as string)}
            className="w-full border-dashed"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Agregar Pregunta
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Editor principal ────────────────────────────────────────────────────────

export default function EditorFormulario({ initialData }: { initialData: any }) {
  const router = useRouter()
  const [nombreCliente, setNombreCliente] = useState(initialData.nombre_cliente)
  const [empresaCliente, setEmpresaCliente] = useState(initialData.empresa_cliente)
  const [bloques, setBloques] = useState<BloqueEditorPayload[]>(initialData.bloques || [])
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  const bloqueSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // ── Bloques ──
  const handleBloqueDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = bloques.findIndex((b) => b.id === active.id)
    const newIndex = bloques.findIndex((b) => b.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      setBloques((prev) => arrayMove(prev, oldIndex, newIndex))
    }
  }

  const addBloque = () => {
    setBloques((prev) => [
      ...prev,
      { id: crypto.randomUUID(), titulo: 'Nuevo Bloque', descripcion: '', orden: prev.length, preguntas: [] },
    ])
  }

  const removeBloque = (bloqueId: string) => {
    setBloques((prev) => prev.filter((b) => b.id !== bloqueId))
  }

  const updateBloque = (bloqueId: string, updates: Partial<BloqueEditorPayload>) => {
    setBloques((prev) => prev.map((b) => (b.id === bloqueId ? { ...b, ...updates } : b)))
  }

  // ── Preguntas ──
  const addPregunta = (bloqueId: string) => {
    setBloques((prev) =>
      prev.map((b) => {
        if (b.id !== bloqueId) return b
        return {
          ...b,
          preguntas: [
            ...b.preguntas,
            {
              id: crypto.randomUUID(),
              texto: 'Nueva pregunta',
              tipo: 'texto_largo',
              opciones: null,
              obligatoria: false,
              orden: b.preguntas.length,
            },
          ],
        }
      })
    )
  }

  const removePregunta = (bloqueId: string, preguntaId: string) => {
    setBloques((prev) =>
      prev.map((b) => {
        if (b.id !== bloqueId) return b
        return { ...b, preguntas: b.preguntas.filter((p) => p.id !== preguntaId) }
      })
    )
  }

  const updatePregunta = (bloqueId: string, preguntaId: string, updates: Partial<PreguntaEditorPayload>) => {
    setBloques((prev) =>
      prev.map((b) => {
        if (b.id !== bloqueId) return b
        return { ...b, preguntas: b.preguntas.map((p) => (p.id === preguntaId ? { ...p, ...updates } : p)) }
      })
    )
  }

  const reorderPreguntas = (bloqueId: string, oldIndex: number, newIndex: number) => {
    setBloques((prev) =>
      prev.map((b) => {
        if (b.id !== bloqueId) return b
        return { ...b, preguntas: arrayMove(b.preguntas, oldIndex, newIndex) }
      })
    )
  }

  // ── Guardar / Publicar ──
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/formularios/${initialData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_cliente: nombreCliente,
          empresa_cliente: empresaCliente,
          bloques: bloques.map((b, i) => ({ ...b, orden: i })),
        }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      router.refresh()
      alert('Guardado exitosamente')
    } catch {
      alert('Ocurrió un error al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!confirm('¿Estás seguro de publicar este formulario? Ya no podrás editarlo.')) return
    setIsPublishing(true)
    try {
      const res = await fetch(`/api/formularios/${initialData.id}/publicar`, { method: 'POST' })
      if (!res.ok) throw new Error('Error al publicar')
      router.refresh()
      router.push('/admin/formularios')
    } catch {
      alert('Ocurrió un error al publicar')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleUnpublish = async () => {
    if (!confirm('¿Estás seguro de volver este formulario a Borrador? Dejará de ser accesible para el cliente hasta que lo vuelvas a publicar.')) return
    setIsPublishing(true)
    try {
      const res = await fetch(`/api/formularios/${initialData.id}/despublicar`, { method: 'POST' })
      if (!res.ok) throw new Error('Error al despublicar')
      window.location.reload()
    } catch {
      alert('Ocurrió un error al volver a borrador')
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="space-y-8 mt-8">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold">Editor de Formulario</h1>
          <p className="text-sm text-gray-500">
            Estado:{' '}
            <span className="font-semibold">
              {initialData.estado === 'enviado' ? 'PUBLICADO' : initialData.estado.toUpperCase()}
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          {initialData.estado === 'borrador' && (
            <AIGeneratorModal
              nombreCliente={nombreCliente}
              empresaCliente={empresaCliente}
              onGenerate={(nuevosBloques) => {
                if (
                  bloques.length === 0 ||
                  confirm('¿Deseas reemplazar las preguntas actuales con las nuevas generadas por IA?')
                ) {
                  setBloques(nuevosBloques)
                } else {
                  setBloques((prev) => [...prev, ...nuevosBloques])
                }
              }}
            />
          )}

          {initialData.estado !== 'borrador' ? (
            <Button
              variant="outline"
              onClick={handleUnpublish}
              disabled={isPublishing}
              className="text-amber-600 border-amber-200 hover:bg-amber-50"
            >
              Volver a Borrador para Editar
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Guardando...' : 'Guardar borrador'}
              </Button>
              <Button onClick={handlePublish} disabled={isPublishing}>
                <Send className="h-4 w-4 mr-2" />
                Publicar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Datos del cliente */}
      <Card className="shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Datos del Cliente</h2>
        </div>
        <CardContent className="flex gap-4 p-6">
          <div className="flex-1 space-y-2">
            <Label>Nombre del contacto</Label>
            <Input value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} />
          </div>
          <div className="flex-1 space-y-2">
            <Label>Empresa</Label>
            <Input value={empresaCliente} onChange={(e) => setEmpresaCliente(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Bloques con drag & drop */}
      <DndContext sensors={bloqueSensors} collisionDetection={closestCenter} onDragEnd={handleBloqueDragEnd}>
        <SortableContext items={bloques.map((b) => b.id as string)} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
            {bloques.map((bloque, bIndex) => (
              <SortableBloque
                key={bloque.id}
                bloque={bloque}
                bIndex={bIndex}
                onUpdateBloque={updateBloque}
                onRemoveBloque={removeBloque}
                onAddPregunta={addPregunta}
                onUpdatePregunta={updatePregunta}
                onRemovePregunta={removePregunta}
                onReorderPreguntas={reorderPreguntas}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button variant="outline" onClick={addBloque} className="w-full h-16 border-dashed text-gray-500 hover:text-gray-900">
        <PlusCircle className="h-5 w-5 mr-2" />
        Agregar Nuevo Bloque
      </Button>
    </div>
  )
}
