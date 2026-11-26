export type RolNombre = 'DOCENTE_UTP' | 'ESTUDIANTE' | 'APODERADO';

export type GuardrailStatus =
  | 'APROBADO'
  | 'BLOQUEADO_INJECTION'
  | 'BLOQUEADO_SIN_CONTEXTO'
  | 'BLOQUEADO_SEGURIDAD'
  | 'CONTENIDO_SOCRATICO';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  rol_activo: RolNombre;
  usuario_id: string;
  nombre_visible: string;
  alias_infantil: string | null;
}

export interface UsuarioCreate {
  email_login: string;
  password: string;
  nombre_visible: string;
  alias_infantil?: string | null;
  nombre_rol: RolNombre;
}

export interface UsuarioResumen {
  usuario_id: string;
  nombre_visible: string;
  alias_infantil: string | null;
  nombre_rol: RolNombre;
  email_login: string;
}

export interface CursoCreate {
  nivel_basico: number; // 1 a 6
  letra_paralelo: string; // 1 caracter
  anio_lectivo: number;
}

export interface CursoOut extends CursoCreate {
  curso_id: string;
  docente_jefe_id: string;
}

export interface AsignaturaCreate {
  curso_id: string;
  nombre_asignatura: string;
  codigo_mineduc: string;
}

export interface AsignaturaOut extends AsignaturaCreate {
  asignatura_id: string;
  docente_id: string;
}

export interface MatriculaVinculoCreate {
  curso_id: string;
  estudiante_id: string;
  apoderado_id: string;
  parentesco: string;
}

export interface MatriculaVinculoOut extends MatriculaVinculoCreate {
  matricula_id: string;
  estudiante_nombre?: string;
  apoderado_nombre?: string;
}

export interface ComunicadoCreate {
  curso_id: string;
  titulo: string;
  fecha_evento: string; // YYYY-MM-DD
}

export interface ComunicadoOut extends ComunicadoCreate {
  comunicado_id: string;
}

export interface DocumentoCurricularOut {
  documento_id: string;
  asignatura_id: string;
  titulo_guia: string;
  objetivo_oa: string;
  nombre_archivo: string;
  peso_bytes: number;
  hash_sha256: string;
  activo_rag: boolean;
  total_chunks_vectorizados: number;
}

export interface MetricasCursoResponse {
  curso_id: string;
  total_interacciones_procesadas: number;
  consultas_contextualizadas_exitosas: number;
  kpi_03_tasa_precision_rag_porcentaje: number;
  objetivos_aprendizaje_mas_consultados: Record<string, number>;
}