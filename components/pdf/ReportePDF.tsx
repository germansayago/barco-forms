import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

// Podríamos cargar la fuente corporativa aquí, usaremos la estándar por defecto.
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff'
  },
  header: {
    marginBottom: 30,
    borderBottom: '2pt solid #4F46E5',
    paddingBottom: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280'
  },
  bloqueContainer: {
    marginTop: 20,
    marginBottom: 10
  },
  bloqueTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: '#F3F4F6',
    padding: 8,
    color: '#1F2937',
    marginBottom: 10
  },
  preguntaContainer: {
    marginBottom: 15,
    paddingLeft: 10
  },
  preguntaTexto: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 5
  },
  respuestaTexto: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 1.4
  },
  sinRespuesta: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    borderTop: '1pt solid #E5E7EB',
    paddingTop: 10
  }
})

export const ReportePDF = ({ form }: { form: any }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Diagnóstico de Marca</Text>
          <Text style={styles.subtitle}>Empresa: {form.empresa_cliente}</Text>
          <Text style={styles.subtitle}>Cliente: {form.nombre_cliente}</Text>
          <Text style={styles.subtitle}>
            Fecha de completado: {new Date(form.fecha_modificacion).toLocaleDateString()}
          </Text>
        </View>

        {form.bloques.map((bloque: any) => (
          <View key={bloque.id} style={styles.bloqueContainer} wrap={false}>
            <Text style={styles.bloqueTitle}>{bloque.titulo}</Text>
            
            {bloque.preguntas.map((pregunta: any) => {
              const respuesta = pregunta.respuestas?.[0]
              const hasRespuesta = respuesta && (
                respuesta.valor_texto || 
                (respuesta.valor_opciones && respuesta.valor_opciones.length > 0) || 
                respuesta.archivo_url ||
                (respuesta.archivos && respuesta.archivos.length > 0)
              )

              return (
                <View key={pregunta.id} style={styles.preguntaContainer} wrap={false}>
                  <Text style={styles.preguntaTexto}>{pregunta.texto}</Text>
                  
                  {!hasRespuesta ? (
                    <Text style={styles.sinRespuesta}>Sin respuesta</Text>
                  ) : (
                    <View>
                      {pregunta.tipo === 'texto_largo' && (
                        <Text style={styles.respuestaTexto}>{respuesta.valor_texto}</Text>
                      )}
                      
                      {(pregunta.tipo === 'seleccion_unica' || pregunta.tipo === 'seleccion_multiple') && (
                        respuesta.valor_opciones.map((op: string, i: number) => (
                          <Text key={i} style={styles.respuestaTexto}>• {op}</Text>
                        ))
                      )}

                      {pregunta.tipo === 'archivo' && (
                        <View>
                          {respuesta.archivos && respuesta.archivos.length > 0 ? (
                            respuesta.archivos.map((file: any, index: number) => (
                              <Text key={index} style={styles.respuestaTexto}>• [Archivo adjunto: {file.nombre}]</Text>
                            ))
                          ) : (
                            respuesta.archivo_url && (
                              <Text style={styles.respuestaTexto}>[Archivo adjunto: {respuesta.archivo_nombre}]</Text>
                            )
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        ))}

        <Text style={styles.footer} fixed>
          Generado automáticamente por BARCO Estrategia de Marca
        </Text>
      </Page>
    </Document>
  )
}
