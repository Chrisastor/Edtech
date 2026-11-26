import {
  AsignaturaCreate,
  AsignaturaOut,
  ComunicadoCreate,
  ComunicadoOut,
  CursoCreate,
  CursoOut,
  DocumentoCurricularOut,
  MatriculaVinculoCreate,
  MatriculaVinculoOut,
  MetricasCursoResponse,
  RolNombre,
  TokenResponse,
  UsuarioCreate,
  UsuarioResumen,
} from '../types/api';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
export const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? 'true').toLowerCase() === 'true';

const TOKEN_STORAGE_KEY = 'edtech_session';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getStoredSession(): TokenResponse | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TokenResponse) : null;
  } catch {
    return null;
  }
}

function getAuthHeaders(includeJson = true): HeadersInit {
  const session = getStoredSession();
  const headers: Record<string, string> = {};
  if (includeJson) headers['Content-Type'] = 'application/json';
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Error HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    } catch {
      // mantener mensaje por defecto
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

// --- DATOS SIMULADOS (MODO MOCK FIEL AL BACKEND) ---
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

const MOCK_DOCENTE_ID = '11111111-1111-4111-8111-111111111111';
const MOCK_ESTUDIANTE_ID = '22222222-2222-4222-8222-222222222222';
const MOCK_APODERADO_ID = '33333333-3333-4333-8333-333333333333';

const mockUsers: (UsuarioResumen & { password: string })[] = [
  {
    usuario_id: MOCK_DOCENTE_ID,
    email_login: 'docente@colegio.cl',
    password: 'password123',
    nombre_visible: 'Prof. María González (UTP)',
    alias_infantil: null,
    nombre_rol: 'DOCENTE_UTP',
  },
  {
    usuario_id: MOCK_ESTUDIANTE_ID,
    email_login: 'estudiante@colegio.cl',
    password: 'password123',
    nombre_visible: 'Mateo Rojas',
    alias_infantil: 'Pudú Explorador',
    nombre_rol: 'ESTUDIANTE',
  },
  {
    usuario_id: MOCK_APODERADO_ID,
    email_login: 'apoderado@colegio.cl',
    password: 'password123',
    nombre_visible: 'Carla Fuentes',
    alias_infantil: null,
    nombre_rol: 'APODERADO',
  },
];

let mockCursos: CursoOut[] = [
  {
    curso_id: 'c1000000-0000-4000-8000-000000000002',
    docente_jefe_id: MOCK_DOCENTE_ID,
    nivel_basico: 2,
    letra_paralelo: 'A',
    anio_lectivo: 2026,
  },
  {
    curso_id: 'c1000000-0000-4000-8000-000000000004',
    docente_jefe_id: MOCK_DOCENTE_ID,
    nivel_basico: 4,
    letra_paralelo: 'B',
    anio_lectivo: 2026,
  },
  {
    curso_id: 'c1000000-0000-4000-8000-000000000006',
    docente_jefe_id: MOCK_DOCENTE_ID,
    nivel_basico: 6,
    letra_paralelo: 'A',
    anio_lectivo: 2026,
  },
];

let mockAsignaturas: AsignaturaOut[] = [
  {
    asignatura_id: 'a1000000-0000-4000-8000-000000000001',
    curso_id: 'c1000000-0000-4000-8000-000000000002',
    docente_id: MOCK_DOCENTE_ID,
    nombre_asignatura: 'Lenguaje y Comunicación',
    codigo_mineduc: 'LEN02',
  },
  {
    asignatura_id: 'a1000000-0000-4000-8000-000000000002',
    curso_id: 'c1000000-0000-4000-8000-000000000004',
    docente_id: MOCK_DOCENTE_ID,
    nombre_asignatura: 'Ciencias Naturales',
    codigo_mineduc: 'CN04',
  },
  {
    asignatura_id: 'a1000000-0000-4000-8000-000000000003',
    curso_id: 'c1000000-0000-4000-8000-000000000006',
    docente_id: MOCK_DOCENTE_ID,
    nombre_asignatura: 'Matemática',
    codigo_mineduc: 'MAT06',
  },
];

let mockMatriculas: MatriculaVinculoOut[] = [
  {
    matricula_id: 'm1000000-0000-4000-8000-000000000001',
    curso_id: 'c1000000-0000-4000-8000-000000000004',
    estudiante_id: MOCK_ESTUDIANTE_ID,
    apoderado_id: MOCK_APODERADO_ID,
    parentesco: 'Madre / Apoderado Titular',
    estudiante_nombre: 'Mateo Rojas (Alias: Pudú Explorador)',
    apoderado_nombre: 'Carla Fuentes',
  },
];

let mockComunicados: ComunicadoOut[] = [
  {
    comunicado_id: 'cm100000-0000-4000-8000-000000000001',
    curso_id: 'c1000000-0000-4000-8000-000000000004',
    titulo: 'Evaluación Formativa: Estados y Cambios de la Materia (OA 11)',
    fecha_evento: '2026-12-04',
  },
];

let mockDocumentos: DocumentoCurricularOut[] = [
  {
    documento_id: 'd1000000-0000-4000-8000-000000000001',
    asignatura_id: 'a1000000-0000-4000-8000-000000000002',
    titulo_guia: 'Guía de Aprendizaje Ciencias Naturales 4° Básico',
    objetivo_oa: 'OA 11 - Estados y cambios de la materia',
    nombre_archivo: 'Guía de Aprendizaje Ciencias Naturales 4° Básico (OA 11).pdf',
    peso_bytes: 106034,
    hash_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    activo_rag: true,
    total_chunks_vectorizados: 9,
  },
];

function checkMockDocenteRBAC() {
  const session = getStoredSession();
  if (!session) throw new ApiError(401, 'Credenciales de autenticación JWT inválidas o expiradas');
  if (session.rol_activo !== 'DOCENTE_UTP') {
    throw new ApiError(
      403,
      "Operación rechazada por política RBAC (CP-08). Rol requerido: ['DOCENTE_UTP']"
    );
  }
  return session;
}

async function computeFileSha256(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }
}

export const apiService = {
  // 1. AUTENTICACIÓN (POST /auth/login en x-www-form-urlencoded y POST /auth/register en JSON)
  async login(email: string, password: string): Promise<TokenResponse> {
    if (USE_MOCK) {
      await wait();
      const user = mockUsers.find((u) => u.email_login.toLowerCase() === email.toLowerCase());
      if (!user || user.password !== password) {
        throw new ApiError(401, 'Correo o contraseña incorrectos');
      }
      return {
        access_token: `mock-jwt-${user.nombre_rol}-${Date.now()}`,
        token_type: 'bearer',
        rol_activo: user.nombre_rol,
        usuario_id: user.usuario_id,
        nombre_visible: user.nombre_visible,
        alias_infantil: user.alias_infantil,
      };
    }

    const body = new URLSearchParams();
    body.append('username', email);
    body.append('password', password);

    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    return handleResponse<TokenResponse>(res);
  },

  async register(datos: UsuarioCreate): Promise<TokenResponse> {
    if (USE_MOCK) {
      await wait();
      if (mockUsers.some((u) => u.email_login.toLowerCase() === datos.email_login.toLowerCase())) {
        throw new ApiError(400, 'El correo electrónico ya está registrado.');
      }
      const nuevo = {
        usuario_id: crypto.randomUUID(),
        email_login: datos.email_login,
        password: datos.password,
        nombre_visible: datos.nombre_visible,
        alias_infantil: datos.nombre_rol === 'ESTUDIANTE' ? datos.alias_infantil || 'Explorador' : null,
        nombre_rol: datos.nombre_rol,
      };
      mockUsers.push(nuevo);
      return {
        access_token: `mock-jwt-${nuevo.nombre_rol}-${Date.now()}`,
        token_type: 'bearer',
        rol_activo: nuevo.nombre_rol,
        usuario_id: nuevo.usuario_id,
        nombre_visible: nuevo.nombre_visible,
        alias_infantil: nuevo.alias_infantil,
      };
    }

    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    return handleResponse<TokenResponse>(res);
  },

  // 2. CURSOS (GET y POST /cursos)
  async listarCursos(): Promise<CursoOut[]> {
    if (USE_MOCK) {
      await wait(150);
      return [...mockCursos];
    }
    const res = await fetch(`${API_URL}/cursos`, { headers: getAuthHeaders() });
    return handleResponse<CursoOut[]>(res);
  },

  async crearCurso(datos: CursoCreate): Promise<CursoOut> {
    if (USE_MOCK) {
      await wait();
      const docente = checkMockDocenteRBAC();
      const letra = datos.letra_paralelo.toUpperCase();
      const existe = mockCursos.some(
        (c) =>
          c.nivel_basico === datos.nivel_basico &&
          c.letra_paralelo === letra &&
          c.anio_lectivo === datos.anio_lectivo
      );
      if (existe) {
        throw new ApiError(400, 'Ya existe un curso registrado con ese nivel, paralelo y año lectivo.');
      }
      const nuevo: CursoOut = {
        curso_id: crypto.randomUUID(),
        docente_jefe_id: docente.usuario_id,
        nivel_basico: datos.nivel_basico,
        letra_paralelo: letra,
        anio_lectivo: datos.anio_lectivo,
      };
      mockCursos = [...mockCursos, nuevo];
      return nuevo;
    }

    const res = await fetch(`${API_URL}/cursos`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(datos),
    });
    return handleResponse<CursoOut>(res);
  },

  // 3. ASIGNATURAS (POST /asignaturas + GET /asignaturas pendiente en backend)
  async listarAsignaturas(cursoId?: string): Promise<AsignaturaOut[]> {
    if (USE_MOCK) {
      await wait(150);
      return cursoId ? mockAsignaturas.filter((a) => a.curso_id === cursoId) : [...mockAsignaturas];
    }
    const qs = cursoId ? `?curso_id=${encodeURIComponent(cursoId)}` : '';
    const res = await fetch(`${API_URL}/asignaturas${qs}`, { headers: getAuthHeaders() });
    return handleResponse<AsignaturaOut[]>(res);
  },

  async crearAsignatura(datos: AsignaturaCreate): Promise<AsignaturaOut> {
    if (USE_MOCK) {
      await wait();
      const docente = checkMockDocenteRBAC();
      const nueva: AsignaturaOut = {
        asignatura_id: crypto.randomUUID(),
        docente_id: docente.usuario_id,
        curso_id: datos.curso_id,
        nombre_asignatura: datos.nombre_asignatura,
        codigo_mineduc: datos.codigo_mineduc.toUpperCase(),
      };
      mockAsignaturas = [...mockAsignaturas, nueva];
      return nueva;
    }

    const res = await fetch(`${API_URL}/asignaturas`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(datos),
    });
    return handleResponse<AsignaturaOut>(res);
  },

  // 4. USUARIOS Y MATRÍCULAS CON VÍNCULO PARENTAL
  async listarUsuariosPorRol(rol: RolNombre): Promise<UsuarioResumen[]> {
    if (USE_MOCK) {
      await wait(100);
      return mockUsers
        .filter((u) => u.nombre_rol === rol)
        .map(({ password: _p, ...rest }) => rest);
    }
    const res = await fetch(`${API_URL}/usuarios?rol=${encodeURIComponent(rol)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<UsuarioResumen[]>(res);
  },

  async listarMatriculasMock(): Promise<MatriculaVinculoOut[]> {
    return [...mockMatriculas];
  },

  async crearMatriculaVinculo(datos: MatriculaVinculoCreate): Promise<{ mensaje: string }> {
    if (USE_MOCK) {
      await wait();
      checkMockDocenteRBAC();
      const est = mockUsers.find((u) => u.usuario_id === datos.estudiante_id);
      const apo = mockUsers.find((u) => u.usuario_id === datos.apoderado_id);
      mockMatriculas = [
        ...mockMatriculas,
        {
          ...datos,
          matricula_id: crypto.randomUUID(),
          estudiante_nombre: est
            ? `${est.nombre_visible}${est.alias_infantil ? ` (Alias: ${est.alias_infantil})` : ''}`
            : datos.estudiante_id,
          apoderado_nombre: apo ? apo.nombre_visible : datos.apoderado_id,
        },
      ];
      return { mensaje: 'Alumno matriculado y vinculado exitosamente con su apoderado mediador.' };
    }

    const res = await fetch(`${API_URL}/matriculas-vinculo`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(datos),
    });
    return handleResponse<{ mensaje: string }>(res);
  },

  // 5. COMUNICADOS ESCOLARES
  async listarComunicados(cursoId?: string): Promise<ComunicadoOut[]> {
    if (USE_MOCK) {
      await wait(150);
      return cursoId ? mockComunicados.filter((c) => c.curso_id === cursoId) : [...mockComunicados];
    }
    const qs = cursoId ? `?curso_id=${encodeURIComponent(cursoId)}` : '';
    const res = await fetch(`${API_URL}/comunicados${qs}`, { headers: getAuthHeaders() });
    return handleResponse<ComunicadoOut[]>(res);
  },

  async publicarComunicado(
    datos: ComunicadoCreate
  ): Promise<{ mensaje: string; comunicado_id: string }> {
    if (USE_MOCK) {
      await wait();
      checkMockDocenteRBAC();
      const id = crypto.randomUUID();
      mockComunicados = [{ ...datos, comunicado_id: id }, ...mockComunicados];
      return { mensaje: 'Comunicado publicado', comunicado_id: id };
    }

    const res = await fetch(`${API_URL}/comunicados`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(datos),
    });
    return handleResponse<{ mensaje: string; comunicado_id: string }>(res);
  },

  // 6. DOCUMENTOS PDF Y VECTORIZACIÓN RAG (multipart/form-data)
  async listarDocumentos(asignaturaId?: string): Promise<DocumentoCurricularOut[]> {
    if (USE_MOCK) {
      await wait(150);
      return asignaturaId
        ? mockDocumentos.filter((d) => d.asignatura_id === asignaturaId)
        : [...mockDocumentos];
    }
    const qs = asignaturaId ? `?asignatura_id=${encodeURIComponent(asignaturaId)}` : '';
    const res = await fetch(`${API_URL}/documentos${qs}`, { headers: getAuthHeaders() });
    return handleResponse<DocumentoCurricularOut[]>(res);
  },

  async subirYVectorizarPDF(params: {
    asignatura_id: string;
    titulo_guia: string;
    objetivo_oa: string;
    activo_rag: boolean;
    archivo_pdf: File;
  }): Promise<DocumentoCurricularOut> {
    if (USE_MOCK) {
      await wait(600);
      checkMockDocenteRBAC();
      if (!params.archivo_pdf.name.toLowerCase().endsWith('.pdf')) {
        throw new ApiError(400, 'Solo se permiten documentos en formato PDF.');
      }
      const hash = await computeFileSha256(params.archivo_pdf);
      const nuevo: DocumentoCurricularOut = {
        documento_id: crypto.randomUUID(),
        asignatura_id: params.asignatura_id,
        titulo_guia: params.titulo_guia,
        objetivo_oa: params.objetivo_oa,
        nombre_archivo: params.archivo_pdf.name,
        peso_bytes: params.archivo_pdf.size,
        hash_sha256: hash,
        activo_rag: params.activo_rag,
        total_chunks_vectorizados: Math.max(3, Math.round(params.archivo_pdf.size / 12000)),
      };
      mockDocumentos = [nuevo, ...mockDocumentos];
      return nuevo;
    }

    const formData = new FormData();
    formData.append('asignatura_id', params.asignatura_id);
    formData.append('titulo_guia', params.titulo_guia);
    formData.append('objetivo_oa', params.objetivo_oa);
    formData.append('activo_rag', String(params.activo_rag));
    formData.append('archivo_pdf', params.archivo_pdf);

    const res = await fetch(`${API_URL}/documentos/subir-y-vectorizar`, {
      method: 'POST',
      headers: getAuthHeaders(false),
      body: formData,
    });
    return handleResponse<DocumentoCurricularOut>(res);
  },

  // 7. MÉTRICAS ANONIMIZADAS DEL CURSO (KPI-03)
  async obtenerMetricasCurso(cursoId: string): Promise<MetricasCursoResponse> {
    if (USE_MOCK) {
      await wait(250);
      checkMockDocenteRBAC();
      const basePorCurso: Record<string, MetricasCursoResponse> = {
        'c1000000-0000-4000-8000-000000000002': {
          curso_id: cursoId,
          total_interacciones_procesadas: 28,
          consultas_contextualizadas_exitosas: 25,
          kpi_03_tasa_precision_rag_porcentaje: 89.29,
          objetivos_aprendizaje_mas_consultados: {
            'OA 05 - Comprensión de fábulas': 19,
            'OA 02 - Lectura en voz alta': 6,
            FILTRO_GUARDRAIL: 2,
            FUERA_DE_CONTEXTO_DOCENTE: 1,
          },
        },
        'c1000000-0000-4000-8000-000000000004': {
          curso_id: cursoId,
          total_interacciones_procesadas: 42,
          consultas_contextualizadas_exitosas: 38,
          kpi_03_tasa_precision_rag_porcentaje: 90.48,
          objetivos_aprendizaje_mas_consultados: {
            'OA 11 - Estados y cambios de la materia': 29,
            'OA 04 - Pueblos Originarios': 9,
            FUERA_DE_CONTEXTO_DOCENTE: 3,
            FILTRO_GUARDRAIL: 1,
          },
        },
      };
      return (
        basePorCurso[cursoId] || {
          curso_id: cursoId,
          total_interacciones_procesadas: 15,
          consultas_contextualizadas_exitosas: 14,
          kpi_03_tasa_precision_rag_porcentaje: 93.33,
          objetivos_aprendizaje_mas_consultados: {
            'OA 03 - Razones y proporcionalidad': 14,
            FUERA_DE_CONTEXTO_DOCENTE: 1,
          },
        }
      );
    }

    const res = await fetch(`${API_URL}/rag/metricas-curso/${cursoId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<MetricasCursoResponse>(res);
  },
};