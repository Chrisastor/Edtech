import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Users,
  Megaphone,
  FileUp,
  BarChart3,
  LogOut,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService, USE_MOCK } from '../services/api';
import {
  AsignaturaOut,
  ComunicadoOut,
  CursoOut,
  DocumentoCurricularOut,
  MatriculaVinculoOut,
  UsuarioResumen,
} from '../types/api';
import AcademicModules from '../components/AcademicModules';
import RagAndMetricsModules from '../components/RagAndMetricsModules';

type TabKey = 'cursos' | 'matriculas' | 'comunicados' | 'guias' | 'metricas';

export default function DashboardPage() {
  const { session, logout } = useAuth();
  const [tab, setTab] = useState<TabKey>('cursos');

  const [cursos, setCursos] = useState<CursoOut[]>([]);
  const [asignaturas, setAsignaturas] = useState<AsignaturaOut[]>([]);
  const [estudiantes, setEstudiantes] = useState<UsuarioResumen[]>([]);
  const [apoderados, setApoderados] = useState<UsuarioResumen[]>([]);
  const [matriculas, setMatriculas] = useState<MatriculaVinculoOut[]>([]);
  const [comunicados, setComunicados] = useState<ComunicadoOut[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoCurricularOut[]>([]);

  const cargarTodo = useCallback(async () => {
    const results = await Promise.allSettled([
      apiService.listarCursos(),
      apiService.listarAsignaturas(),
      apiService.listarUsuariosPorRol('ESTUDIANTE'),
      apiService.listarUsuariosPorRol('APODERADO'),
      apiService.listarMatriculasMock(),
      apiService.listarComunicados(),
      apiService.listarDocumentos(),
    ]);

    if (results[0].status === 'fulfilled') setCursos(results[0].value);
    if (results[1].status === 'fulfilled') setAsignaturas(results[1].value);
    if (results[2].status === 'fulfilled') setEstudiantes(results[2].value);
    if (results[3].status === 'fulfilled') setApoderados(results[3].value);
    if (results[4].status === 'fulfilled') setMatriculas(results[4].value);
    if (results[5].status === 'fulfilled') setComunicados(results[5].value);
    if (results[6].status === 'fulfilled') setDocumentos(results[6].value);
  }, []);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  const navItems: { key: TabKey; label: string; icon: typeof BookOpen }[] = [
    { key: 'cursos', label: 'Cursos y Asignaturas', icon: BookOpen },
    { key: 'matriculas', label: 'Matrículas y Vínculos', icon: Users },
    { key: 'comunicados', label: 'Comunicados', icon: Megaphone },
    { key: 'guias', label: 'Guías PDF (RAG)', icon: FileUp },
    { key: 'metricas', label: 'Métricas KPI-03', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100">
      {/* Barra Lateral */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">EdTech IA</p>
            <p className="text-[11px] text-slate-400">Panel DOCENTE_UTP</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const activo = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activo
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="text-xs">
            <p className="font-semibold text-white truncate">{session?.nombre_visible}</p>
            <p className="text-slate-400">Rol: {session?.rol_activo}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full py-2 px-3 bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 p-5 md:p-8 overflow-y-auto">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {navItems.find((i) => i.key === tab)?.label}
            </h1>
            <p className="text-xs text-slate-500">
              Gestión curricular y monitoreo pedagógico — Enseñanza Básica Chile
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              USE_MOCK
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
            }`}
          >
            {USE_MOCK ? 'MODO SIMULADO (MOCK)' : 'CONECTADO A FASTAPI'}
          </span>
        </header>

        {tab === 'cursos' || tab === 'matriculas' || tab === 'comunicados' ? (
          <AcademicModules
            vista={tab}
            cursos={cursos}
            asignaturas={asignaturas}
            estudiantes={estudiantes}
            apoderados={apoderados}
            matriculas={matriculas}
            comunicados={comunicados}
            onRefresh={cargarTodo}
          />
        ) : (
          <RagAndMetricsModules
            vista={tab}
            cursos={cursos}
            asignaturas={asignaturas}
            documentos={documentos}
            onRefresh={cargarTodo}
          />
        )}
      </main>
    </div>
  );
}