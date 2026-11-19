import uuid
from typing import Any
import httpx
import google.generativeai as _genai
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.models.sql_models import EmbeddingVectorial, DocumentoCurricular

genai: Any = _genai

if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "sin_configurar":
    genai.configure(api_key=settings.GEMINI_API_KEY)

class HybridRAGEngine:
    """
    Orquestador del Motor Híbrido RAG (Gemini Cloud API + Gemma Local en RTX 4060).
    Implementa patrón Circuit Breaker para Alta Disponibilidad (SLA-02 / CP-10).
    """

    SYSTEM_PROMPT_ESTUDIANTE = """Eres un tutor escolar socrático, amable y motivador para niños de 1° a 6° básico en Chile.
REGLAS ESTRICTAS DE CONTENCIÓN PEDAGÓGICA (CURRICULUM NACIONAL MINEDUC):
1. Responde ÚNICA Y EXCLUSIVAMENTE usando la información del [CONTEXTO DEL PROFESOR] entregado abajo. No inventes datos externos.
2. PROHIBIDO ENTREGAR LA RESPUESTA DIRECTA DE LA TAREA. Tu objetivo es dar pistas explicativas paso a paso, usar ejemplos sencillos para niños y terminar con una pregunta reflexiva para que el estudiante descubra la solución por sí mismo.
3. Utiliza español de Chile neutro y cercano (usa "ustedes" o "tú", jamás uses "vosotros")."""

    SYSTEM_PROMPT_APODERADO = """Eres un asesor pedagógico especialista en el Currículum Nacional de Educación Básica de Chile (Modo "Ayúdame a Ayudar").
Estableces comunicación con la madre, padre o apoderado de un estudiante de 1° a 6° básico.
REGLAS ESTRICTAS:
1. Basa tu explicación ÚNICA Y EXCLUSIVAMENTE en el [CONTEXTO DEL PROFESOR] entregado abajo.
2. No resuelvas la tarea del niño. Entrega al adulto una pauta didáctica de 3 pasos: (a) Qué concepto clave busca enseñar el profesor, (b) Un ejemplo cotidiano o analogía de la casa para explicárselo al niño, y (c) Qué preguntas hacerle a su hijo para guiarlo sin frustración."""

    @staticmethod
    async def generate_embedding_768(texto: str) -> list[float]:
        """Genera vector de 768 dimensiones en la RTX 4060 vía Ollama (nomic-embed-text)."""
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/api/embeddings",
                    json={"model": settings.OLLAMA_EMBED_MODEL, "prompt": texto}
                )
                resp.raise_for_status()
                vector = resp.json()["embedding"]
                return vector[:768]
        except Exception:
            res = genai.embed_content(
                model="models/text-embedding-004",
                content=texto,
                output_dimensionality=768
            )
            return res["embedding"]


    @staticmethod
    async def build_retrieval_query(
        db: AsyncSession,
        asignatura_id: uuid.UUID,
        pregunta_usuario: str
    ) -> str:
        stmt = (
            select(DocumentoCurricular.titulo_guia, DocumentoCurricular.objetivo_oa)
            .where(
                DocumentoCurricular.asignatura_id == asignatura_id,
                DocumentoCurricular.activo_rag == True
            )
        )
        res = await db.execute(stmt)
        docs = res.all()
        if not docs:
            return pregunta_usuario

        resumen_guias = "; ".join(
            f"{d.titulo_guia} ({d.objetivo_oa})" for d in docs
        )
        return f"{pregunta_usuario} — Material de la asignatura: {resumen_guias}" 

    @staticmethod
    async def retrieve_relevant_chunks(
        db: AsyncSession,
        asignatura_id: uuid.UUID,
        query_vector: list[float],
        top_k: int = 3
    ) -> list[dict]:
        """Búsqueda vectorial HNSW en PostgreSQL (pgvector) mediante similitud del coseno."""
        distancia_coseno = EmbeddingVectorial.embedding.cosine_distance(query_vector)
        similitud_coseno = (1 - distancia_coseno).label("similitud")

        stmt = (
            select(
                EmbeddingVectorial.texto_fragmento,
                EmbeddingVectorial.pagina_origen,
                DocumentoCurricular.titulo_guia,
                DocumentoCurricular.objetivo_oa,
                similitud_coseno
            )
            .join(DocumentoCurricular, EmbeddingVectorial.documento_id == DocumentoCurricular.documento_id)
            .where(
                DocumentoCurricular.asignatura_id == asignatura_id,
                DocumentoCurricular.activo_rag == True
            )
            .order_by(distancia_coseno.asc())
            .limit(top_k)
        )

        result = await db.execute(stmt)
        filas = result.all()

        return [
            {
                "texto_fragmento": f.texto_fragmento,
                "pagina_origen": f.pagina_origen,
                "titulo_guia": f.titulo_guia,
                "objetivo_oa": f.objetivo_oa,
                "similitud": float(f.similitud)
            }
            for f in filas
        ]

    @classmethod
    async def generate_socratic_response(
        cls,
        pregunta_usuario: str,
        chunks_recuperados: list[dict],
        modo: str = "ALUMNO"
    ) -> tuple[str, str]:
        contexto_formateado = "\n\n".join(
            [f"[Guía: {c['titulo_guia']} | {c['objetivo_oa']} | Pág. {c['pagina_origen']}]: {c['texto_fragmento']}"
             for c in chunks_recuperados]
        )

        system_instruction = cls.SYSTEM_PROMPT_ESTUDIANTE if modo == "ALUMNO" else cls.SYSTEM_PROMPT_APODERADO
        prompt_final = (
            f"{system_instruction}\n\n"
            f"--- [CONTEXTO DEL PROFESOR] ---\n{contexto_formateado}\n-------------------------------\n\n"
            f"Consulta del {modo.lower()}: {pregunta_usuario}\n"
            f"Respuesta guiada:"
        )

        # 1. Intento Primario: Gemini Cloud API (si está configurada)
        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "sin_configurar":
            try:
                model = genai.GenerativeModel(settings.GEMINI_MODEL)
                response = await model.generate_content_async(
                    prompt_final,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.1,
                        max_output_tokens=450
                    )
                )
                return response.text, "GEMINI_CLOUD_API"
            except Exception as e:
                print(f"[Circuit Breaker Activado] Fallo en Gemini API ({e}). Conmutando a Ollama Local RTX 4060...")

        # 2. Inferencia Local en RTX 4060 (Ollama - gemma3:4b)
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": settings.OLLAMA_LLM_MODEL,
                    "prompt": prompt_final,
                    "stream": False,
                    "options": {"temperature": 0.1}
                }
            )
            resp.raise_for_status()
            return resp.json()["response"], f"OLLAMA_LOCAL_RTX4060 ({settings.OLLAMA_LLM_MODEL})"
        