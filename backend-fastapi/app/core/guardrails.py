import re

class ChildSafetyGuardrails:
    """
    Filtro Algorítmico Ético (RNF-01, RNF-05 y OWASP LLM Top 10).
    Previene Prompt Injection, lenguaje inapropiado y solicitudes de resolución directa de tareas.
    """

    INJECTION_PATTERNS = [
        r"ignora\s+(tus|las)\s+(reglas|instrucciones)",
        r"olvida\s+(todo|tus\s+instrucciones)",
        r"actúa\s+como",
        r"actua\s+como",
        r"system\s*prompt",
        r"modo\s+desarrollador",
        r"jailbreak",
    ]

    DIRECT_ANSWER_PATTERNS = [
        r"hazme\s+la\s+tarea",
        r"escríbeme\s+(el\s+resumen|la\s+respuesta|el\s+ensayo|la\s+tarea)",
        r"escribeme\s+(el\s+resumen|la\s+respuesta|el\s+ensayo|la\s+tarea)",
        r"listo\s+para\s+copiar",
        r"dame\s+la\s+respuesta\s+directa",
        r"resuelve\s+toda\s+la\s+guía",
        r"resuelve\s+toda\s+la\s+guia",
    ]

    BANNED_TOPICS = [
        "violencia", "armas", "drogas", "alcohol", "apuestas", "suicidio", "sexo"
    ]

    @classmethod
    def validate_prompt(cls, prompt: str) -> tuple[bool, str, str]:
        texto_limpio = prompt.lower().strip()

        for palabra in cls.BANNED_TOPICS:
            if re.search(rf"\b{palabra}\b", texto_limpio):
                return (
                    False,
                    "BLOQUEADO_SEGURIDAD",
                    "¡Hola! Como tu asistente escolar, solo puedo ayudarte con temas de tus asignaturas del colegio. Si tienes una inquietud importante, conversa con tus profesores o tu familia."
                )

        for patron in cls.INJECTION_PATTERNS:
            if re.search(patron, texto_limpio):
                return (
                    False,
                    "BLOQUEADO_INJECTION",
                    "¡Buen intento de explorador digital! Pero mis reglas están fijas para ayudarte a aprender paso a paso con el material de tu profesor. ¿Qué parte de la guía te gustaría entender mejor?"
                )

        for patron in cls.DIRECT_ANSWER_PATTERNS:
            if re.search(patron, texto_limpio):
                return (
                    False,
                    "CONTENIDO_SOCRATICO",
                    "Mi misión no es hacer la tarea por ti para copiar y pegar, ¡sino ayudarte a descubrir la respuesta! Cuéntame: ¿qué es lo primero que entiendes de la pregunta de tu guía?"
                )

        return True, "APROBADO", ""