import React, { useState } from 'react';
import { Plus, CheckCircle2, AlertTriangle, Users, Megaphone, BookOpen } from 'lucide-react';
import {
  AsignaturaOut,
  ComunicadoOut,
  CursoOut,
  MatriculaVinculoOut,
  UsuarioResumen,
} from '../types/api';
import { apiService } from '../services/api';

interface Props {
  vista: 'cursos' | 'matriculas' | 'comunicados';
  cursos: CursoOut[];
  asignaturas: AsignaturaOut[];
  estudiantes: UsuarioResumen[];
  apoderados: UsuarioResumen[];
  matriculas: MatriculaVinculoOut[];
  comunicados: ComunicadoOut[];
  onRefresh: () => Promise<void>;
}

export default function AcademicModules({
  vista,
  cursos,
  asignaturas,
  estudiantes,
  apoderados,
  matriculas,
  comunicados,
  onRefresh,
}: Props) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estado Cursos
  const [nivelBasico, setNivelBasico] = useState(4);
  const [letraParalelo, setLetraParalelo] = useState('A');
  const [anioLectivo, setAnioLectivo] = useState(2026);

  // Estado Asignaturas
  const [asigCursoId, setAsigCursoId] = useState(cursos[0]?.curso_id || '');
  const [nombreAsignatura, setNombreAsignatura] = useState('');
  const [codigoMineduc, setCodigoMineduc] = useState('');

  // Estado Matrícula + Vínculo Parental
  const [matCursoId, setMatCursoId] = useState(cursos[0]?.curso_id || '');
  const [estudianteId, setEstudianteId] = useState(estudiantes[0]?.usuario_id || '');
  const [apoderadoId, setApoderadoId] = useState(apoderados[0]?.usuario_id || '');
  const [parentesco, setParentesco] = useState('Apoderado Titular');

  // Estado Comunicados
  const [comCursoId, setComCursoId] = useState(cursos[0]?.curso_id || '');
  const [comTitulo, setComTitulo] = useState('');
  const [comFecha, setComFecha] = useState('2026-12-10');

  const limpiarAvisos = () => {
    setMensaje(null);
    setError(null);
  };

  const etiquetaCurso = (cursoId: string) => {
    const c = cursos.find((item) => item.curso_id === cursoId);
    return c ? `${c.nivel_basico}° Básico ${c.letra_paralelo} (${c.anio_lectivo})` : cursoId;
  };

  const handleCrearCurso = async (e: React.FormEvent) => {
    e.preventDefault();
    limpiarAvisos();
    try {
      const creado = await apiService.crearCurso({
        nivel_basico: Number(nivelBasico),
        letra_paralelo: letraParalelo.trim().toUpperCase(),
        anio_lectivo: Number(anioLectivo),
      });
      setMensaje(`Curso ${creado.nivel_basico}° Básico ${creado.letra_paralelo} creado correctamente.`);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el curso.');
    }
  };

  const handleCrearAsignatura = async (e: React.FormEvent) => {
    e.preventDefault();
    limpiarAvisos();
    const targetCurso = asigCursoId || cursos[0]?.curso_id;
    if (!targetCurso) {
      setError('Primero debes crear o seleccionar un curso.');
      return;
    }
    try {
      const creada = await apiService.crearAsignatura({
        curso_id: targetCurso,
        nombre_asignatura: nombreAsignatura.trim(),
        codigo_mineduc: codigoMineduc.trim().toUpperCase(),
      });
      setMensaje(`Asignatura ${creada.nombre_asignatura} (${creada.codigo_mineduc}) registrada.`);
      setNombreAsignatura('');
      setCodigoMineduc('');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la asignatura.');
    }
  };

  const handleMatricular = async (e: React.FormEvent) => {
    e.preventDefault();
    limpiarAvisos();
    const targetCurso = matCursoId || cursos[0]?.curso_id;
    const targetEst = estudianteId || estudiantes[0]?.usuario_id;
    const targetApo = apoderadoId || apoderados[0]?.usuario_id;
    if (!targetCurso || !targetEst || !targetApo) {
      setError('Completa curso, estudiante y apoderado (UUID).');
      return;
    }
    try {
      const res = await apiService.crearMatriculaVinculo({
        curso_id: targetCurso,
        estudiante_id: targetEst,
        apoderado_id: targetApo,
        parentesco: parentesco.trim() || 'Apoderado Titular',
      });
      setMensaje(res.mensaje);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la matrícula.');
    }
  };

  const handlePublicarComunicado = async (e: React.FormEvent) => {
    e.preventDefault();
    limpiarAvisos();
    const targetCurso = comCursoId || cursos[0]?.curso_id;
    if (!targetCurso) {
      setError('Selecciona un curso válido.');
      return;
    }
    try {
      const res = await apiService.publicarComunicado({
        curso_id: targetCurso,
        titulo: comTitulo.trim(),
        fecha_evento: comFecha,
      });
      setMensaje(`${res.mensaje} (ID: ${res.comunicado_id.slice(0, 8)}...)`);
      setComTitulo('');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo publicar el comunicado.');
    }
  };

  return (
    <div className="space-y-6">
      {mensaje && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{mensaje}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {vista === 'cursos' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Crear Curso */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Crear Curso (1° a 6° Básico)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Restringido por regla de negocio MINEDUC (`POST /api/v1/cursos`).
            </p>
            <form onSubmit={handleCrearCurso} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nivel (1-6)
                  </label>
                  <select
                    value={nivelBasico}
                    onChange={(e) => setNivelBasico(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n}° Básico
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Paralelo
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={1}
                    value={letraParalelo}
                    onChange={(e) => setLetraParalelo(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Año</label>
                  <input
                    type="number"
                    required
                    value={anioLectivo}
                    onChange={(e) => setAnioLectivo(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Registrar Curso
              </button>
            </form>

            <div className="mt-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">
                Cursos Activos ({cursos.length})
              </h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {cursos.map((c) => (
                  <div key={c.curso_id} className="px-4 py-2.5 flex justify-between items-center text-sm bg-slate-50/50">
                    <span className="font-semibold text-slate-800">
                      {c.nivel_basico}° Básico {c.letra_paralelo}
                    </span>
                    <span className="text-xs text-slate-500">Año {c.anio_lectivo}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Crear Asignatura */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Asignaturas Curriculares</h2>
            <p className="text-xs text-slate-500 mb-4">
              Asocia cada asignatura a un curso y su código oficial MINEDUC (`POST /api/v1/asignaturas`).
            </p>
            <form onSubmit={handleCrearAsignatura} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Curso</label>
                <select
                  value={asigCursoId || cursos[0]?.curso_id || ''}
                  onChange={(e) => setAsigCursoId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  {cursos.map((c) => (
                    <option key={c.curso_id} value={c.curso_id}>
                      {c.nivel_basico}° Básico {c.letra_paralelo} ({c.anio_lectivo})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nombre asignatura
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Historia y Geografía"
                    value={nombreAsignatura}
                    onChange={(e) => setNombreAsignatura(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Código MINEDUC
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: HIS04"
                    value={codigoMineduc}
                    onChange={(e) => setCodigoMineduc(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Guardar Asignatura
              </button>
            </form>

            <div className="mt-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">
                Asignaturas Registradas ({asignaturas.length})
              </h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {asignaturas.map((a) => (
                  <div key={a.asignatura_id} className="px-4 py-2.5 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-semibold text-slate-800">{a.nombre_asignatura}</p>
                      <p className="text-xs text-slate-500">{etiquetaCurso(a.curso_id)}</p>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-indigo-50 text-indigo-700 rounded">
                      {a.codigo_mineduc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {vista === 'matriculas' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-indigo-600" />
            Matrícula y Vínculo Parental (Prevención BOLA/IDOR)
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Asocia un estudiante a un curso y autoriza a su apoderado mediador (`POST /api/v1/matriculas-vinculo`).
          </p>

          <form onSubmit={handleMatricular} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Curso</label>
              <select
                value={matCursoId || cursos[0]?.curso_id || ''}
                onChange={(e) => setMatCursoId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {cursos.map((c) => (
                  <option key={c.curso_id} value={c.curso_id}>
                    {c.nivel_basico}° Básico {c.letra_paralelo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Parentesco</label>
              <input
                type="text"
                required
                value={parentesco}
                onChange={(e) => setParentesco(e.target.value)}
                placeholder="Ej: Madre / Padre / Tutor Legal"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Estudiante (se muestra alias infantil)
              </label>
              {estudiantes.length > 0 ? (
                <select
                  value={estudianteId || estudiantes[0].usuario_id}
                  onChange={(e) => setEstudianteId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  {estudiantes.map((est) => (
                    <option key={est.usuario_id} value={est.usuario_id}>
                      {est.nombre_visible} — Alias: {est.alias_infantil || 'Sin alias'}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="UUID del estudiante"
                  value={estudianteId}
                  onChange={(e) => setEstudianteId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Apoderado mediador
              </label>
              {apoderados.length > 0 ? (
                <select
                  value={apoderadoId || apoderados[0].usuario_id}
                  onChange={(e) => setApoderadoId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  {apoderados.map((apo) => (
                    <option key={apo.usuario_id} value={apo.usuario_id}>
                      {apo.nombre_visible} ({apo.email_login})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="UUID del apoderado"
                  value={apoderadoId}
                  onChange={(e) => setApoderadoId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                />
              )}
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold"
              >
                Matricular y Vincular Apoderado
              </button>
            </div>
          </form>

          <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">
            Vínculos Registrados ({matriculas.length})
          </h3>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Curso</th>
                  <th className="px-4 py-2.5">Estudiante</th>
                  <th className="px-4 py-2.5">Apoderado</th>
                  <th className="px-4 py-2.5">Parentesco</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matriculas.map((m) => (
                  <tr key={m.matricula_id}>
                    <td className="px-4 py-2.5 font-medium">{etiquetaCurso(m.curso_id)}</td>
                    <td className="px-4 py-2.5">{m.estudiante_nombre || m.estudiante_id}</td>
                    <td className="px-4 py-2.5">{m.apoderado_nombre || m.apoderado_id}</td>
                    <td className="px-4 py-2.5 text-slate-600">{m.parentesco}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {vista === 'comunicados' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
            <Megaphone className="w-5 h-5 text-indigo-600" />
            Comunicados Oficiales y Fechas de Evaluación
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Publica avisos visibles para las familias del curso (`POST /api/v1/comunicados`).
          </p>

          <form onSubmit={handlePublicarComunicado} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Curso</label>
              <select
                value={comCursoId || cursos[0]?.curso_id || ''}
                onChange={(e) => setComCursoId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {cursos.map((c) => (
                  <option key={c.curso_id} value={c.curso_id}>
                    {c.nivel_basico}° Básico {c.letra_paralelo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Fecha del evento
              </label>
              <input
                type="date"
                required
                value={comFecha}
                onChange={(e) => setComFecha(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Título / Mensaje del comunicado (máx. 150 caracteres)
              </label>
              <input
                type="text"
                required
                maxLength={150}
                placeholder="Ej: Prueba de Matemática OA 03 — Traer regla y lápiz grafito"
                value={comTitulo}
                onChange={(e) => setComTitulo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold"
              >
                Publicar Comunicado
              </button>
            </div>
          </form>

          <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">
            Comunicados Publicados ({comunicados.length})
          </h3>
          <div className="space-y-2.5">
            {comunicados.map((com) => (
              <div
                key={com.comunicado_id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{com.titulo}</p>
                  <p className="text-xs text-slate-500">{etiquetaCurso(com.curso_id)}</p>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-100 text-indigo-800 rounded-full w-fit">
                  Evento: {com.fecha_evento}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}