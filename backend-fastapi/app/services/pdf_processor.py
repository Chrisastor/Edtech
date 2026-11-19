import hashlib
import fitz  # PyMuPDF
from fastapi import HTTPException

class PDFProcessorService:
    """
    Subproceso 2.1: Extracción de texto limpio por página y partición semántica
    en chunks de ~500 tokens con solapamiento (overlap) de 80 tokens.
    """

    @staticmethod
    def compute_sha256(file_bytes: bytes) -> str:
        return hashlib.sha256(file_bytes).hexdigest()

    @staticmethod
    def extract_and_chunk_pdf(
        file_bytes: bytes,
        chunk_size_words: int = 380,
        overlap_words: int = 60
    ) -> list[dict]:
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception:
            raise HTTPException(status_code=400, detail="El archivo subido no es un PDF válido.")

        chunks_generados = []
        chunk_idx = 0

        for num_pagina in range(len(doc)):
            pagina = doc.load_page(num_pagina)
            texto_bruto = str(pagina.get_text("text"))
            texto_pagina = " ".join(texto_bruto.split())

            if not texto_pagina:
                continue

            palabras = texto_pagina.split(" ")
            inicio = 0

            while inicio < len(palabras):
                fin = min(inicio + chunk_size_words, len(palabras))
                fragmento_str = " ".join(palabras[inicio:fin]).strip()

                if len(fragmento_str) > 30:
                    chunk_hash = hashlib.sha256(fragmento_str.encode("utf-8")).hexdigest()
                    chunks_generados.append({
                        "chunk_index": chunk_idx,
                        "pagina_origen": num_pagina + 1,
                        "texto_fragmento": fragmento_str,
                        "hash_sha256": chunk_hash
                    })
                    chunk_idx += 1

                if fin == len(palabras):
                    break
                inicio += (chunk_size_words - overlap_words)

        doc.close()

        if not chunks_generados:
            raise HTTPException(
                status_code=422,
                detail="El PDF no contiene texto seleccionable legible (posible imagen escaneada). Suba una guía digital con texto válido."
            )

        return chunks_generados