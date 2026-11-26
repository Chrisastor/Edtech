import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { apiService } from './services/api';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

function AccesoDenegadoCP08() {
  const { session, logout } = useAuth();
  const [resultadoPrueba, setResultadoPrueba] = useState<string | null>(null);

  const probarRechazo403 = async () => {
    try {
      await apiService.crearCurso({ nivel_basico: 4, letra_paralelo: 'Z', anio_lectivo: 2026 });
      setResultadoPrueba('ALERTA: El servidor permitió la acción inesperadamente.');
    } catch (err) {
      setResultadoPrueba(
        `Validación CP-08 EXITOSA — Respuesta recibida: ${
          err instanceof Error ? err.message : 'HTTP 403 Forbidden'
        }`
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg border border-rose-200 p-8 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          Acceso Restringido (HTTP 403 — Política RBAC)
        </h1>
        <p className="text-sm text-slate-600">
          Hola{' '}
          <strong>
            {session?.rol_activo === 'ESTUDIANTE'
              ? session.alias_infantil || 'Estudiante'
              : session?.nombre_visible}
          </strong>
          . Tu rol actual es <span className="font-mono font-bold">{session?.rol_activo}</span>.
          Este portal web es exclusivo para usuarios <strong>DOCENTE_UTP</strong>; las vistas y
          acciones docentes permanecen ocultas y bloqueadas.
        </p>

        <div className="pt-2 space-y-3">
          <button
            type="button"
            onClick={probarRechazo403}
            className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold"
          >
            Ejecutar Prueba QA CP-08 (Intentar POST /cursos)
          </button>

          {resultadoPrueba && (
            <div className="p-3 rounded-lg bg-slate-900 text-emerald-400 text-xs font-mono text-left">
              {resultadoPrueba}
            </div>
          )}

          <button
            type="button"
            onClick={logout}
            className="w-full py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Volver al Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { session } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/acceso-denegado"
        element={session ? <AccesoDenegadoCP08 /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/"
        element={
          !session ? (
            <Navigate to="/login" replace />
          ) : session.rol_activo !== 'DOCENTE_UTP' ? (
            <Navigate to="/acceso-denegado" replace />
          ) : (
            <DashboardPage />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}