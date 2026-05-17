'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function RespuestasViewer({ form }: { form: any }) {
  const handleExportPDF = async () => {
    // LLamar al endpoint de PDF
    window.open(`/api/formularios/${form.id}/exportar`, '_blank')
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Resultados: {form.empresa_cliente}
          </h1>
          <p className="text-gray-500 mt-1">
            Cliente: {form.nombre_cliente} | Estado: <Badge variant="secondary" className="ml-1 capitalize">{form.estado}</Badge>
          </p>
        </div>
        {form.estado === 'completado' && (
          <Button onClick={handleExportPDF} className="bg-indigo-600 hover:bg-indigo-700">
            <Download className="mr-2 h-4 w-4" />
            Exportar a PDF
          </Button>
        )}
      </div>

      <div className="space-y-10">
        {form.bloques.map((bloque: any) => (
          <Card key={bloque.id} className="shadow-sm">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="text-lg">{bloque.titulo}</CardTitle>
              {bloque.descripcion && <p className="text-sm text-gray-500 mt-1">{bloque.descripcion}</p>}
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              {bloque.preguntas.map((pregunta: any) => {
                const respuesta = pregunta.respuestas?.[0]
                const hasRespuesta = respuesta && (
                  respuesta.valor_texto || 
                  (respuesta.valor_opciones && respuesta.valor_opciones.length > 0) || 
                  respuesta.archivo_url ||
                  (respuesta.archivos && respuesta.archivos.length > 0)
                )

                return (
                  <div key={pregunta.id} className="border-b pb-6 last:border-0 last:pb-0">
                    <h3 className="font-medium text-gray-900 mb-3">{pregunta.texto}</h3>
                    
                    {!hasRespuesta ? (
                      <p className="text-gray-400 italic text-sm">Sin respuesta</p>
                    ) : (
                      <div className="text-gray-700 text-sm bg-gray-50 p-4 rounded-md whitespace-pre-wrap">
                        {pregunta.tipo === 'texto_largo' && respuesta.valor_texto}
                        
                        {(pregunta.tipo === 'seleccion_unica' || pregunta.tipo === 'seleccion_multiple') && (
                          <ul className="list-disc list-inside space-y-1">
                            {respuesta.valor_opciones.map((opcion: string, idx: number) => (
                              <li key={idx}>{opcion}</li>
                            ))}
                          </ul>
                        )}

                        {pregunta.tipo === 'archivo' && (
                          <div className="space-y-2">
                            {respuesta.archivos && respuesta.archivos.length > 0 ? (
                              respuesta.archivos.map((file: any, index: number) => (
                                <a 
                                  key={index}
                                  href={file.url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="flex items-center text-indigo-600 hover:underline"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  {file.nombre || 'Ver archivo adjunto'}
                                </a>
                              ))
                            ) : (
                              respuesta.archivo_url && (
                                <a 
                                  href={respuesta.archivo_url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="flex items-center text-indigo-600 hover:underline"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  {respuesta.archivo_nombre || 'Ver archivo adjunto'}
                                </a>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
