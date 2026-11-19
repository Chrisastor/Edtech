
# 🎓 Sistema Multiplataforma de Acompañamiento Educativo IA (RAG)
**Proyecto de Título – TIHI84 (INACAP)**  
**Integrantes:**  
* **Christopher Alejandro Astorga González** (Líder de Proyecto / Backend & AI Developer)
* **Paulo Bastián Ortega Negrete** (Desarrollador Frontend & Móvil / Analista QA)

---

## 📌 Estado Actual del Repositorio: Módulo 1 Completado (Core Backend, BD & Seguridad RBAC)

¡Hola Paulo! En este primer *push* ya se encuentra operativo el **Módulo 1 del Backend Asíncrono en FastAPI**. Deja lista toda la base de autenticación, roles y estructura académica para que puedas empezar a conectar el **Portal Web Docente (React)** y la **App Móvil (React Native + SQLite)** o ejecutar las primeras pruebas en Swagger / Postman.

### ⚠️ Cambio Arquitectónico Importante (Optimización de Persistencia)
* **Eliminación de MongoDB:** Se descartó el uso de MongoDB para evitar la sobrecarga de memoria y latencia innecesaria.
* **Nuevo Flujo de Almacenamiento:** Los archivos PDF subidos por los profesores se guardan físicamente en el disco del servidor (`storage/guias_pdf/`), mientras que su índice, hash `SHA-256` (para tu sincronización con SQLite), fragmentos de texto (*chunks*), vectores de 768 dimensiones (`pgvector` con índice `HNSW`) y logs anonimizados viven íntegramente en **PostgreSQL 16**.

---

## 📂 Estructura Actual del Proyecto

```text
backend-fastapi/
├── docker-compose.yml          # Levanta PostgreSQL 16 + extensión pgvector
├── .env.example                # Plantilla de variables de entorno
├── requirements.txt            # Dependencias de Python 3.11
├── storage/
│   └── guias_pdf/              # Carpeta física donde se guardan los PDFs en el servidor
└── app/
    ├── main.py                 # Punto de entrada ASGI, compresión Gzip (<500 KB) y Smoke Test
    ├── core/
    │   ├── config.py           # Configuración centralizada
    │   └── security.py         # Hashing Bcrypt, Tokens JWT, RBAC y Hash Anónimo Infantil
    ├── db/
    │   └── session.py          # Pool de conexiones asíncrono (SQLAlchemy 2.0 + asyncpg)
    ├── models/
    │   └── sql_models.py       # Las 10 tablas del sistema (incluyendo pgvector y auditoría)
    ├── schemas/
    │   └── base_schemas.py     # Validadores Pydantic v2 (Contratos JSON)
    └── api/
        └── v1_endpoints.py     # Endpoints RESTful de Autenticación, Cursos, Asignaturas y Matrículas
```

---

## 🚀 Guía Rápida de Instalación (Paso a Paso)

### 1. Requisitos Previos
* **Docker Desktop** instalado y corriendo.
* **Python 3.11+** instalado.

### 2. Configurar Variables de Entorno
Crea un archivo llamado `.env` dentro de `backend-fastapi/` con el siguiente contenido:

```env
PG_USER=edtech_admin
PG_PASSWORD=secret_password
PG_HOST=localhost
PG_PORT=5432
PG_DB=edtech_curricular
JWT_SECRET_KEY=clave_criptografica_escolar_alta_entropia_2026
```

### 3. Levantar la Base de Datos (PostgreSQL 16 + `pgvector`)
Abre una terminal en la carpeta donde está el `docker-compose.yml` y ejecuta:

```bash
docker compose up -d
```
*(Verifica que el contenedor `edtech_pgvector` esté corriendo en el puerto `5432`).*

### 4. Instalar Dependencias y Ejecutar el Servidor FastAPI
Crea tu entorno virtual, instala las librerías y levanta Uvicorn:

```bash
python -m venv venv
# En Windows:
venv\Scripts\activate
# En Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

> **✨ Automatización incluida:** Al iniciar `uvicorn`, el método `lifespan` en `app/main.py` habilita automáticamente la extensión `vector` en PostgreSQL, construye las **10 tablas** y siembra automáticamente los 3 roles base (`DOCENTE_UTP`, `ESTUDIANTE`, `APODERADO`). No necesitas correr scripts SQL manuales.

---

## 🔌 Endpoints Disponibles en este Módulo 1 (Para Frontend y QA)

Una vez encendido el servidor, entra a la documentación interactiva en:  
👉 **[http://localhost:8000/docs](http://localhost:8000/docs)**

| Método | Endpoint | Rol Requerido (RBAC) | Descripción / Historia de Usuario |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Público | **Smoke Test (QA):** Verifica estado de PostgreSQL, almacenamiento y Gzip. |
| `POST` | `/api/v1/auth/register` | Público | Registra un usuario (`DOCENTE_UTP`, `ESTUDIANTE` o `APODERADO`) y devuelve su JWT. |
| `POST` | `/api/v1/auth/login` | Público | Login estándar OAuth2. Devuelve `access_token`, `rol_activo`, `usuario_id` y `alias_infantil`. |
| `POST` | `/api/v1/cursos` | `DOCENTE_UTP` | **HU-01:** Crea un curso restringido de 1° a 6° Básico (`nivel_basico` 1..6). |
| `GET` | `/api/v1/cursos` | Cualquier Rol | Lista los cursos activos. |
| `POST` | `/api/v1/asignaturas` | `DOCENTE_UTP` | **HU-01:** Crea una asignatura asociada a un curso y código MINEDUC. |
| `POST` | `/api/v1/matriculas-vinculo` | `DOCENTE_UTP` | **HU-02:** Matricula al estudiante en un curso y lo vincula con su apoderado. |
| `POST` | `/api/v1/comunicados` | `DOCENTE_UTP` | **HU-05:** Publica comunicados oficiales y fechas de evaluación para un curso. |

---

## 🧪 Cómo Probar el Caso de Prueba `CP-08` (Seguridad RBAC)

1. Ve a `/docs` y registra un usuario con `"nombre_rol": "DOCENTE_UTP"` y otro con `"nombre_rol": "ESTUDIANTE"` en `POST /api/v1/auth/register`.
2. Inicia sesión en el botón verde **Authorize** arriba a la derecha usando el correo y contraseña del **ESTUDIANTE**.
3. Intenta ejecutar `POST /api/v1/cursos`.
4. **Resultado Esperado:** El servidor bloqueará la petición con código **`HTTP 403 Forbidden`** (*"Operación rechazada por política RBAC"*), validando el control de acceso por rol.

---

## 🔜 Próximo Incremento (En Desarrollo - Módulo 2)
* Subida de PDFs físicos a `storage/guias_pdf/` con extracción de texto (`PyMuPDF`) y partición de *chunks*.
* Generación de embeddings de 768 dimensiones en la RTX 4060 (Ollama) e indexación en `pgvector`.
* Endpoints de consulta para el **Tutor Socrático** (Estudiante) y modo **"Ayúdame a Ayudar"** (Apoderado) con *Guardrails* infantiles.
## 🚀 Módulo 2 Completado: Ingesta PDF, Motor Híbrido RAG y Guardrails

Ya se encuentra operativo el **Módulo 2**, incorporando la carga y procesamiento de guías curriculares en PDF, la recuperación semántica con `pgvector`, la generación guiada en modos `ALUMNO` y `PADRE`, y las capas de contención y auditoría:

* **Almacenamiento físico e ingesta de PDFs (`PyMuPDF`):** Guarda el archivo en `backend-fastapi/storage/guias_pdf/`, calcula su `hash_sha256`, extrae el texto por página y genera *chunks* con solapamiento (*overlap*).
* **Embeddings y Motor Híbrido RAG:** Genera vectores de **768 dimensiones** con `nomic-embed-text` en **Ollama** (GPU RTX 4060) y respuestas guiadas con `gemma3:4b` (Ollama local) o **Gemini Cloud API** con *failover* / *circuit breaker*.
* **Búsqueda contextualizada por asignatura (`build_retrieval_query`):** Enriquece la consulta de búsqueda con los títulos y Objetivos de Aprendizaje (`OA`) activos de la `asignatura_id` seleccionada, evitando bloqueos indebidos ante consultas abiertas o genéricas (por ejemplo, apoyo parental).
* **Modos pedagógicos y `ChildSafetyGuardrails`:**
  * **`ALUMNO`:** Tutor socrático con pistas paso a paso y preguntas de reflexión sin entregar la respuesta directa.
  * **`PADRE` ("Ayúdame a Ayudar"):** Pauta didáctica de 3 pasos (concepto clave, analogía cotidiana y preguntas guía).
  * **Guardrails:** Contención determinista ante *prompt injection* / copia directa (`BLOQUEADO_INJECTION`) y bloqueo cuando no hay contexto o similitud suficiente (`BLOQUEADO_SIN_CONTEXTO`).
* **Métricas docentes anonimizadas:** Consulta agregada por curso (`GET /api/v1/rag/metricas-curso/{curso_id}`) con total de interacciones, consultas contextualizadas exitosas (`APROBADO`), tasa `KPI-03` y desglose por `OA` o filtro.

### Nuevos Endpoints del Módulo 2

| Método | Endpoint | Rol Requerido (RBAC) | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/documentos/subir-y-vectorizar` | `DOCENTE_UTP` | Sube el PDF a disco, extrae/fragmenta texto, genera vectores de 768-d e indexa en `pgvector`. |
| `GET` | `/api/v1/documentos/{documento_id}/descargar` | Cualquier Rol | Descarga la guía curricular PDF para sincronización / uso offline. |
| `POST` | `/api/v1/rag/consultar` | Cualquier Rol | Evalúa guardrails, recupera *chunks* en `pgvector` y genera respuesta en modo `ALUMNO` o `PADRE`. |
| `GET` | `/api/v1/rag/metricas-curso/{curso_id}` | `DOCENTE_UTP` | Entrega métricas anónimas y desglose por `OA` / estado de guardrail del curso. |

### Guías de Prueba Curriculares (1° a 6° Básico)
Para validar la ingesta y el comportamiento del tutor en distintos niveles y actividades[cite: 1]:
1. **Lenguaje y Comunicación – 2° Básico (`OA 05`):** Fábula *"El Pudú Veloz y la Tortuga del Bosque"* (comprensión lectora y moraleja)[cite: 1].
2. **Ciencias Naturales – 4° Básico (`OA 11`):** Estados y cambios de la materia (ideal para analogías en modo `PADRE`)[cite: 1].
3. **Matemática – 6° Básico (`OA 03`):** Razones y proporcionalidad (razonamiento paso a paso sin resolver el cálculo)[cite: 1].

---

