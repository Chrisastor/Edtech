import React, { useEffect, useState } from 'react';
import { FileUp, BarChart3, CheckCircle2, AlertTriangle, Upload, ShieldCheck } from 'lucide-react';
import {
  AsignaturaOut,
  CursoOut,
  DocumentoCurricularOut,
  MetricasCursoResponse,
} from '../types/api';
import { apiService } from '../services/api';

interface Props {
  vista: 'guias' | 'metricas';
  cursos: CursoOut[];
  asignaturas: AsignaturaOut[];
  documentos: DocumentoCurricularOut[];
  onRefresh: () => Promise<void>;
}

export default function RagAndMetricsModules({
  vista,
  cursos,
  asignaturas,
  documentos,
  onRefresh,
}: Props) {
  const [asignaturaId, setAsignaturaId] = useState(asignaturas[0]?.asignatura_id || '');
  const [tituloGuia, setTituloGuia] = useState('');
  const [objetivoOa, setObjetivoOa] = useState('');
  const [activoRag, setActivoRag] = useState(true);
  const [archivoPdf, setArchivoPdf] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [resultadoUpload, setResultadoUpload] = useState<DocumentoCurricularOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estado Métricas KPI-03
  const [cursoMetricaId, setCursoMetricaId] = useState(cursos[0]?.curso_id || '');
  const [metricas, setMetricas] = useState<MetricasCursoResponse | null>(null);
  const [cargandoMetricas, setCargandoMetricas] = useState(false);

  useEffect(() => {
    if (!cursoMetricaId && cursos.length > 0) {
      setCursoMetricaId(cursos[0].curso_id);
    }
  }, [cursos, cursoMetricaId]);

  useEffect(() => {
    if (vista !== 'metricas' || !cursoMetricaId) return;
    let cancelado = false;
    setCargandoMetricas(true);
    setError(null);
    apiService
      .obtenerMetricasCurso(cursoMetricaId)
      .then((data) => {
        if (!cancelado) setMetricas(data);
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof Error ? err.message : 'Error cargando métricas.');
      })
      .finally(() => {
        if (!cancelado) setCargandoMetricas(false);
      });
    return () => {
      cancelado = true;
    };
  }, [vista, cursoMetricaId]);

  const handleSubirPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResultadoUpload(null);
    const targetAsig = asignaturaId || asignaturas[0]?.asignatura_id;
    if (!targetAsig) {
      setError('Primero crea o selecciona una asignatura.');
      return;
    }
    if (!archivoPdf) {
      setError('Debes adjuntar un archivo en formato PDF.');
      return;
    }
    setSubiendo(true);
    try {
      const resp = await apiService.subirYVectorizarPDF({
        asignatura_id: targetAsig,
        titulo_guia: tituloGuia.trim(),
        objetivo_oa: objetivoOa.trim(),
        activo_rag: activoRag,
        archivo_pdf: archivoPdf,
      });
      setResultadoUpload(resp);
      setTituloGuia('');
      setObjetivoOa('');
      setArchivoPdf(null);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir y vectorizar el PDF.');
    } finally {
      setSubiendo(false);
    }
  };

  const nombreAsignatura = (asigId: string) => {
    const a = asignaturas.find((item) => item.asignatura_id === asigId);
    return a ? `${a.nombre_asignatura} (${a.codigo_mineduc})` : asigId;
  };

  if (vista === 'guias') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
            <FileUp className="w-5 h-5 text-indigo-600" />
            Carga de Guías PDF e Indexación RAG (pgvector)
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Sube guías digitales con texto seleccionable (`POST /api/v1/documentos/subir-y-vectorizar`). Se genera hash SHA-256 para sincronización diferencial móvil.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resultadoUpload && (
            <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm space-y-1">
              <p className="font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Guía vectorizada con éxito
              </p>
              <p>
                Chunks indexados en pgvector: <strong>{resultadoUpload.total_chunks_vectorizados}</strong> | Peso:{' '}
                <strong>{(resultadoUpload.peso_bytes / 1024).toFixed(1)} KB</strong>
              </p>
              <p className="text-xs font-mono break-all text-emerald-700">
                SHA-256: {resultadoUpload.hash_sha256}
              </p>
            </div>
          )}

          <form onSubmit={handleSubirPdf} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Asignatura</label>
              <select
                value={asignaturaId || asignaturas[0]?.asignatura_id || ''}
                onChange={(e) => setAsignaturaId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {asignaturas.map((a) => (
                  <option key={a.asignatura_id} value={a.asignatura_id}>
                    {a.nombre_asignatura} ({a.codigo_mineduc})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Objetivo de Aprendizaje (OA)
              </label>
              <input
                type="text"
                required
                placeholder="Ej: OA 11 - Estados de la materia"
                value={objetivoOa}
                onChange={(e) => setObjetivoOa(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Título de la Guía
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Guía de Aprendizaje Ciencias Naturales 4° Básico"
                value={tituloGuia}
                onChange={(e) => setTituloGuia(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Archivo PDF curricular
              </label>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setArchivoPdf(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activoRag}
                  onChange={(e) => setActivoRag(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                Habilitar inmediatamente para consultas del Tutor IA (activo_rag)
              </label>

              <button
                type="submit"
                disabled={subiendo}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {subiendo ? 'Extrayendo y vectorizando...' : 'Subir y Vectorizar PDF'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-3">
            Guías Curriculares Indexadas ({documentos.length})
          </h3>
          <div className="space-y-3">
            {documentos.map((doc) => (
              <div
                key={doc.documento_id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-slate-900 text-sm">{doc.titulo_guia}</p>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                    {doc.objetivo_oa}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {nombreAsignatura(doc.asignatura_id)} • Archivo: {doc.nombre_archivo} (
                  {(doc.peso_bytes / 1024).toFixed(1)} KB) • Chunks: {doc.total_chunks_vectorizados}
                </p>
                <p className="text-[11px] font-mono text-slate-400 break-all">
                  SHA-256 (sync móvil): {doc.hash_sha256}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // VISTA MÉTRICAS ANONIMIZADAS (KPI-03)
  const entradasTopicos = metricas
    ? Object.entries(metricas.objetivos_aprendizaje_mas_consultados).sort((a, b) => b[1] - a[1])
    : [];
  const maxValor = Math.max(...entradasTopicos.map(([, v]) => v), 1);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Panel de Métricas Docentes Anonimizadas (KPI-03)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Privacy by Design: estadísticas agregadas por curso sin exponer datos personales ni alias individuales.
            </p>
          </div>
          <select
            value={cursoMetricaId}
            onChange={(e) => setCursoMetricaId(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium"
          >
            {cursos.map((c) => (
              <option key={c.curso_id} value={c.curso_id}>
                {c.nivel_basico}° Básico {c.letra_paralelo} ({c.anio_lectivo})
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {cargandoMetricas && <p className="text-sm text-slate-500">Cargando métricas del curso...</p>}

        {metricas && !cargandoMetricas && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase">
                  Total interacciones RAG
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {metricas.total_interacciones_procesadas}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <p className="text-xs font-semibold text-emerald-700 uppercase">
                  Consultas contextualizadas (APROBADO)
                </p>
                <p className="text-3xl font-bold text-emerald-800 mt-1">
                  {metricas.consultas_contextualizadas_exitosas}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                <p className="text-xs font-semibold text-indigo-700 uppercase">
                  KPI-03 Precisión Curricular RAG
                </p>
                <p className="text-3xl font-bold text-indigo-800 mt-1">
                  {metricas.kpi_03_tasa_precision_rag_porcentaje}%
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3">
                Desglose de Objetivos de Aprendizaje (OA) y Contención Guardrails
              </h3>
              <div className="space-y-3">
                {entradasTopicos.map(([topico, cantidad]) => {
                  const esBloqueo =
                    topico.includes('GUARDRAIL') || topico.includes('FUERA_DE_CONTEXTO');
                  const ancho = Math.round((cantidad / maxValor) * 100);
                  return (
                    <div key={topico}>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span className={esBloqueo ? 'text-amber-700 font-semibold' : 'text-slate-700'}>
                          {topico}
                        </span>
                        <span className="text-slate-600">{cantidad} consultas</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${ancho}%` }}
                          className={`h-full rounded-full ${
                            esBloqueo ? 'bg-amber-500' : 'bg-indigo-600'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}