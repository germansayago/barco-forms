'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlusCircle, Save, Send, Trash2 } from 'lucide-react'
import { BloqueEditorPayload, PreguntaEditorPayload } from '@/types'
import { AIGeneratorModal } from './AIGeneratorModal'

export default function EditorFormulario({ initialData }: { initialData: any }) {
  const router = useRouter()
  const [nombreCliente, setNombreCliente] = useState(initialData.nombre_cliente)
  const [empresaCliente, setEmpresaCliente] = useState(initialData.empresa_cliente)
  const [bloques, setBloques] = useState<BloqueEditorPayload[]>(initialData.bloques || [])
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

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
    } catch (err) {
      alert('Ocurrió un error al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!confirm('¿Estás seguro de publicar este formulario? Ya no podrás editarlo.')) return
    setIsPublishing(true)
    try {
      const res = await fetch(`/api/formularios/${initialData.id}/publicar`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Error al publicar')
      router.refresh()
      router.push('/admin/formularios')
    } catch (err) {
      alert('Ocurrió un error al publicar')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleUnpublish = async () => {
    if (!confirm('¿Estás seguro de volver este formulario a Borrador? Dejará de ser accesible para el cliente hasta que lo vuelvas a publicar.')) return
    setIsPublishing(true)
    try {
      const res = await fetch(`/api/formularios/${initialData.id}/despublicar`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Error al despublicar')
      router.refresh()
      // Reload page state or redirect
      window.location.reload()
    } catch (err) {
      alert('Ocurrió un error al volver a borrador')
    } finally {
      setIsPublishing(false)
    }
  }

  const addBloque = () => {
    setBloques([
      ...bloques,
      {
        id: crypto.randomUUID(),
        titulo: 'Nuevo Bloque',
        descripcion: '',
        orden: bloques.length,
        preguntas: [],
      },
    ])
  }

  const removeBloque = (bloqueId: string) => {
    setBloques(bloques.filter((b) => b.id !== bloqueId))
  }

  const updateBloque = (bloqueId: string, updates: Partial<BloqueEditorPayload>) => {
    setBloques(bloques.map((b) => (b.id === bloqueId ? { ...b, ...updates } : b)))
  }

  const addPregunta = (bloqueId: string) => {
    setBloques(
      bloques.map((b) => {
        if (b.id === bloqueId) {
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
        }
        return b
      })
    )
  }

  const removePregunta = (bloqueId: string, preguntaId: string) => {
    setBloques(
      bloques.map((b) => {
        if (b.id === bloqueId) {
          return { ...b, preguntas: b.preguntas.filter((p) => p.id !== preguntaId) }
        }
        return b
      })
    )
  }

  const updatePregunta = (bloqueId: string, preguntaId: string, updates: Partial<PreguntaEditorPayload>) => {
    setBloques(
      bloques.map((b) => {
        if (b.id === bloqueId) {
          return {
            ...b,
            preguntas: b.preguntas.map((p) => (p.id === preguntaId ? { ...p, ...updates } : p)),
          }
        }
        return b
      })
    )
  }

  return (
    <div className="space-y-8 mt-8">
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold">Editor de Formulario</h1>
          <p className="text-sm text-gray-500">
            Estado: <span className="font-semibold">{initialData.estado === 'enviado' ? 'PUBLICADO' : initialData.estado.toUpperCase()}</span>
          </p>
        </div>
        <div className="flex gap-3">
          {initialData.estado === 'borrador' && (
            <AIGeneratorModal
              nombreCliente={nombreCliente}
              empresaCliente={empresaCliente}
              onGenerate={(nuevosBloques) => {
                // Si el editor estaba vacío o el usuario acepta reemplazar, machacamos los bloques
                if (bloques.length === 0 || confirm('¿Deseas reemplazar las preguntas actuales con las nuevas generadas por IA?')) {
                  setBloques(nuevosBloques)
                } else {
                  // Opcional: Agregar al final
                  setBloques([...bloques, ...nuevosBloques])
                }
              }}
            />
          )}

          {initialData.estado !== 'borrador' ? (
            <Button variant="outline" onClick={handleUnpublish} disabled={isPublishing} className="text-amber-600 border-amber-200 hover:bg-amber-50">
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

      <Card>
        <CardHeader>
          <CardTitle>Datos del Cliente</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
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

      <div className="space-y-6">
        {bloques.map((bloque, bIndex) => (
          <Card key={bloque.id} className="shadow-md border-gray-200 border-t-4 border-t-indigo-600 overflow-hidden">
            <div className="bg-gray-50/80 p-6 border-b border-gray-100 flex justify-between items-start gap-4">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center bg-indigo-100 text-indigo-700 font-bold rounded-full w-8 h-8 text-sm shadow-sm">
                    {bIndex + 1}
                  </span>
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sección / Bloque</Label>
                </div>
                <Input
                  value={bloque.titulo}
                  onChange={(e) => updateBloque(bloque.id as string, { titulo: e.target.value })}
                  className="font-bold text-xl bg-white border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm"
                  placeholder="Título del bloque"
                />
                <Input
                  value={bloque.descripcion || ''}
                  onChange={(e) => updateBloque(bloque.id as string, { descripcion: e.target.value })}
                  className="text-sm bg-white border-gray-200 focus:border-indigo-500 shadow-sm"
                  placeholder="Descripción breve (opcional)"
                />
              </div>
              <Button variant="outline" size="icon" className="text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors" onClick={() => removeBloque(bloque.id as string)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            <CardContent className="p-6 space-y-6 bg-white">
              {bloque.preguntas.map((pregunta, pIndex) => (
                <div key={pregunta.id} className="flex gap-4 p-5 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-50 items-start relative transition-all group shadow-sm">
                  <div className="absolute -left-3 -top-3 w-7 h-7 bg-white shadow-sm border border-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs font-bold z-10">
                    {pIndex + 1}
                  </div>
                  
                  <div className="flex-1 space-y-5 pt-1">
                    <Input
                      value={pregunta.texto}
                      onChange={(e) => updatePregunta(bloque.id as string, pregunta.id as string, { texto: e.target.value })}
                      placeholder="Escribe la pregunta aquí..."
                      className="bg-white font-medium text-gray-900 border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    
                    <div className="flex flex-wrap gap-4 items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                      <div className="flex-1 min-w-[200px]">
                        <Label className="text-xs text-gray-500 mb-1.5 block">Tipo de respuesta</Label>
                        <select
                          className="flex h-9 w-full items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                          value={pregunta.tipo}
                          onChange={(e) => updatePregunta(bloque.id as string, pregunta.id as string, { tipo: e.target.value as any })}
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
                            onChange={(e) => updatePregunta(bloque.id as string, pregunta.id as string, { obligatoria: e.target.checked })}
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
                          onChange={(e) => updatePregunta(bloque.id as string, pregunta.id as string, { opciones: e.target.value.split(',').map(s => s.trim()) })}
                          placeholder="Opción 1, Opción 2, Opción 3 (separadas por coma)"
                          className="bg-white shadow-sm focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                  
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-4" onClick={() => removePregunta(bloque.id as string, pregunta.id as string)}>
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              ))}
              
              <Button variant="outline" size="sm" onClick={() => addPregunta(bloque.id as string)} className="w-full border-dashed">
                <PlusCircle className="h-4 w-4 mr-2" />
                Agregar Pregunta
              </Button>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" onClick={addBloque} className="w-full h-16 border-dashed text-gray-500 hover:text-gray-900">
          <PlusCircle className="h-5 w-5 mr-2" />
          Agregar Nuevo Bloque
        </Button>
      </div>
    </div>
  )
}
