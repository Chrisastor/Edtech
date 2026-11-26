import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { USE_MOCK } from '../services/api';
import { RolNombre } from '../types/api';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [modo, setModo] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('docente@colegio.cl');
  const [password, setPassword] = useState('password123');
  const [nombreVisible, setNombreVisible] = useState('');
  const [aliasInfantil, setAliasInfantil] = useState('');
  const [rol, setRol] = useState<RolNombre>('DOCENTE_UTP');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const redirigirSegunRol = (rolActivo: RolNombre) => {
    if (rolActivo === 'DOCENTE_UTP') {
      navigate('/', { replace: true });
    } else {
      navigate('/acceso-denegado', { replace: true });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const sesion =
        modo === 'login'
          ? await login(email, password)
          : await register({
              email_login: email,
              password,
              nombre_visible: nombreVisible,
              alias_infantil: rol === 'ESTUDIANTE' ? aliasInfantil : null,
              nombre_rol: rol,
            });
      redirigirSegunRol(sesion.rol_activo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al autenticar.');
    } finally {
      setCargando(false);
    }
  };

  const accesoRapido = async (correoDemo: string) => {
    setError(null);
    setCargando(true);
    try {
      const sesion = await login(correoDemo, 'password123');
      redirigirSegunRol(sesion.rol_activo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en acceso rápido.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Portal Web Docente</h1>
            <p className="text-xs text-slate-500">
              Sistema Multiplataforma IA (1° a 6° Básico — MINEDUC)
            </p>
          </div>
        </div>

        <div className="my-4 flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
          <span className="font-medium text-slate-600">Estado de conexión:</span>
          <span
            className={`px-2 py-0.5 rounded-full font-semibold ${
              USE_MOCK ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {USE_MOCK ? 'MODO SIMULADO (MOCK)' : 'FASTAPI REAL'}
          </span>
        </div>

        <div className="flex rounded-lg bg-slate-100 p-1 mb-5">
          <button
            type="button"
            onClick={() => {
              setModo('login');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${
              modo === 'login' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setModo('register');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${
              modo === 'register' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            Registrar Usuario
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {modo === 'register' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre visible
                </label>
                <input
                  type="text"
                  required
                  value={nombreVisible}
                  onChange={(e) => setNombreVisible(e.target.value)}
                  placeholder="Ej: Prof. Ana Morales"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Rol RBAC
                </label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value as RolNombre)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="DOCENTE_UTP">DOCENTE_UTP (Acceso Portal Web)</option>
                  <option value="ESTUDIANTE">ESTUDIANTE (Para probar bloqueo CP-08)</option>
                  <option value="APODERADO">APODERADO (Solo App Móvil)</option>
                </select>
              </div>

              {rol === 'ESTUDIANTE' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Alias infantil (privacidad menores)
                  </label>
                  <input
                    type="text"
                    required
                    value={aliasInfantil}
                    onChange={(e) => setAliasInfantil(e.target.value)}
                    placeholder="Ej: Cóndor Curioso"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="docente@colegio.cl"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña (mín. 6 caracteres)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition"
          >
            <Lock className="w-4 h-4" />
            {cargando ? 'Procesando...' : modo === 'login' ? 'Ingresar con JWT' : 'Crear cuenta'}
          </button>
        </form>

        {USE_MOCK && (
          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2.5">
              Accesos rápidos para pruebas QA (Modo Mock)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => accesoRapido('docente@colegio.cl')}
                className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold border border-indigo-200 transition"
              >
                Entrar como Docente
              </button>
              <button
                type="button"
                onClick={() => accesoRapido('estudiante@colegio.cl')}
                className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 transition"
              >
                Probar CP-08 (Alumno)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}