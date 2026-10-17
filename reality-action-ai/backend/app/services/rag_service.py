"""
REALITY → ACTION AI – Lightweight In-Memory RAG Service

Architecture:
  Knowledge Corpus (Markdown) → Section Chunking → In-Memory Vector Index
  User Question / Context → Embed Query → Cosine Similarity → Top-K Retrieved Chunks
"""

from __future__ import annotations

import hashlib
import json
import logging
import math
import os
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Default knowledge directory
KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent / "data" / "knowledge"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


@dataclass
class KnowledgeChunk:
    """A single chunk from the knowledge base."""
    id: str
    source: str
    title: str
    content: str
    embedding: Optional[List[float]] = None


@dataclass
class RetrievedChunk:
    """A retrieved chunk with relevance score."""
    title: str
    content: str
    score: float
    source: str


# ── Cosine Similarity & Math Helpers ─────────────────────────────────────────

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Calculate the cosine similarity between two float vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0

    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))

    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0

    return max(-1.0, min(1.0, dot / (norm1 * norm2)))


def _compute_lexical_embedding(text: str, vocab: List[str]) -> List[float]:
    """Fallback term-frequency vectorizer for offline testing and fallback."""
    words = re.findall(r"\b[a-z0-9_-]+\b", text.lower())
    total = len(words) or 1
    counts: Dict[str, int] = {}
    for w in words:
        counts[w] = counts.get(w, 0) + 1

    return [counts.get(token, 0) / total for token in vocab]


# ── Markdown Document Loader & Chunker ───────────────────────────────────────

def chunk_markdown_document(content: str, filename: str) -> List[KnowledgeChunk]:
    """
    Split a Markdown document into focused semantic chunks based on headers.
    Preserves document title and section title.
    """
    chunks: List[KnowledgeChunk] = []
    lines = content.splitlines()

    doc_title = filename
    # Extract top # Document Title if present
    for line in lines:
        if line.startswith("# ") and not line.startswith("## "):
            doc_title = line.lstrip("# ").strip()
            break

    # Split by ## headers
    sections: List[Tuple[str, List[str]]] = []
    current_section_title = doc_title
    current_lines: List[str] = []

    for line in lines:
        if line.startswith("## "):
            if current_lines:
                body = "\n".join(current_lines).strip()
                if body:
                    sections.append((current_section_title, current_lines))
            current_section_title = line.lstrip("# ").strip()
            current_lines = [line]
        else:
            current_lines.append(line)

    if current_lines:
        body = "\n".join(current_lines).strip()
        if body:
            sections.append((current_section_title, current_lines))

    # Build KnowledgeChunk objects
    for idx, (sec_title, sec_lines) in enumerate(sections):
        sec_text = "\n".join(sec_lines).strip()
        # Clean markdown headers inside text
        clean_body = re.sub(r"^#+\s*", "", sec_text, flags=re.MULTILINE).strip()
        if not clean_body:
            continue

        chunk_id = f"{filename}#part-{idx+1}"
        chunks.append(
            KnowledgeChunk(
                id=chunk_id,
                source=filename,
                title=f"{doc_title} → {sec_title}" if sec_title != doc_title else doc_title,
                content=clean_body,
            )
        )

    return chunks


# ── RAGService ───────────────────────────────────────────────────────────────

class RAGService:
    """
    In-memory vector store and retrieval service for technical knowledge grounding.
    """

    def __init__(
        self,
        knowledge_dir: Optional[Path] = None,
        hf_token: Optional[str] = None,
        use_cloud_embeddings: bool = True,
    ) -> None:
        self.knowledge_dir = knowledge_dir or KNOWLEDGE_DIR
        self.hf_token = hf_token
        self.use_cloud_embeddings = use_cloud_embeddings

        self._chunks: List[KnowledgeChunk] = []
        self._vocab: List[str] = []
        self._is_indexed = False

        # In-memory embedding cache: key -> list[float]
        self._embedding_cache: Dict[str, List[float]] = {}

        # Lazy HuggingFace InferenceClient
        self._hf_client = None

    def _get_hf_client(self):
        """Lazily initialize InferenceClient if token is available."""
        if self._hf_client is None and self.use_cloud_embeddings:
            try:
                from huggingface_hub import InferenceClient
                from app.config.settings import get_settings

                token = self.hf_token or get_settings().hf_token
                if token:
                    self._hf_client = InferenceClient(api_key=token, timeout=30.0)
            except Exception as e:
                logger.debug("Could not initialize InferenceClient for embeddings: %s", e)
        return self._hf_client

    # ── Indexing & Loading ───────────────────────────────────────────────────

    def load_documents(self) -> List[KnowledgeChunk]:
        """Load and chunk all Markdown files in the knowledge directory."""
        if not self.knowledge_dir.exists():
            logger.warning("Knowledge directory does not exist: %s", self.knowledge_dir)
            return []

        all_chunks: List[KnowledgeChunk] = []
        for file_path in sorted(self.knowledge_dir.glob("*.md")):
            try:
                text = file_path.read_text(encoding="utf-8")
                chunks = chunk_markdown_document(text, file_path.name)
                all_chunks.extend(chunks)
            except Exception as exc:
                logger.error("Failed to read knowledge file %s: %s", file_path.name, exc)

        self._chunks = all_chunks

        # Build vocabulary for lexical fallback
        words = set()
        for c in self._chunks:
            for w in re.findall(r"\b[a-z0-9_-]+\b", f"{c.title} {c.content}".lower()):
                if len(w) > 2:
                    words.add(w)
        self._vocab = sorted(list(words))

        logger.info(
            "Loaded %d chunks from %s", len(self._chunks), self.knowledge_dir
        )
        return self._chunks

    def build_index(self) -> None:
        """
        Embed all loaded chunks into memory.
        Uses cloud embeddings via Hugging Face if available, otherwise lexical vectors.
        """
        if not self._chunks:
            self.load_documents()

        if not self._chunks:
            logger.warning("No knowledge chunks to index.")
            self._is_indexed = True
            return

        client = self._get_hf_client()

        for chunk in self._chunks:
            cache_key = hashlib.md5(chunk.content.encode("utf-8")).hexdigest()
            if cache_key in self._embedding_cache:
                chunk.embedding = self._embedding_cache[cache_key]
                continue

            emb: Optional[List[float]] = None

            # Attempt cloud embedding if client is ready
            if client:
                try:
                    import numpy as np

                    raw = client.feature_extraction(
                        f"{chunk.title}\n{chunk.content}",
                        model=EMBEDDING_MODEL,
                    )
                    # Convert ndarray to list of floats
                    if hasattr(raw, "tolist"):
                        vector = raw.tolist()
                        # If batched/nested, flatten or take first row
                        if vector and isinstance(vector[0], list):
                            vector = vector[0]
                        emb = [float(x) for x in vector]
                except Exception as exc:
                    logger.debug("Cloud embedding failed for chunk '%s': %s", chunk.id, exc)

            # Fallback to normalized lexical vector if cloud embedding unavailable
            if emb is None:
                emb = _compute_lexical_embedding(
                    f"{chunk.title} {chunk.content}", self._vocab
                )

            self._embedding_cache[cache_key] = emb
            chunk.embedding = emb

        self._is_indexed = True
        logger.info("Indexed %d knowledge chunks into in-memory vector store.", len(self._chunks))

    def _get_query_embedding(self, query: str) -> List[float]:
        """Compute query embedding with cache."""
        cache_key = f"q:{hashlib.md5(query.encode('utf-8')).hexdigest()}"
        if cache_key in self._embedding_cache:
            return self._embedding_cache[cache_key]

        emb: Optional[List[float]] = None
        client = self._get_hf_client()

        if client and self.use_cloud_embeddings:
            try:
                import numpy as np

                raw = client.feature_extraction(
                    query,
                    model=EMBEDDING_MODEL,
                )
                if hasattr(raw, "tolist"):
                    vector = raw.tolist()
                    if vector and isinstance(vector[0], list):
                        vector = vector[0]
                    emb = [float(x) for x in vector]
            except Exception as exc:
                logger.debug("Cloud query embedding failed: %s", exc)

        if emb is None:
            emb = _compute_lexical_embedding(query, self._vocab)

        self._embedding_cache[cache_key] = emb
        return emb

    # ── Retrieval ────────────────────────────────────────────────────────────

    async def retrieve(self, query: str, top_k: int = 3) -> List[RetrievedChunk]:
        """
        Retrieve the top-k most relevant knowledge chunks for a query.

        Args:
            query: The search query or technical question.
            top_k: Number of chunks to return (default 3).

        Returns:
            List of RetrievedChunk with title, content, score, and source.
        """
        if not query or not query.strip():
            return []

        if not self._is_indexed:
            self.build_index()

        if not self._chunks:
            return []

        clean_query = query.strip()
        query_emb = self._get_query_embedding(clean_query)

        scored_chunks: List[RetrievedChunk] = []
        for chunk in self._chunks:
            if not chunk.embedding:
                continue

            score = cosine_similarity(query_emb, chunk.embedding)

            # Keyword presence bonus for exact keyword matches in title/content
            query_terms = [t for t in re.findall(r"\b[a-z0-9_-]+\b", clean_query.lower()) if len(t) > 2]
            if query_terms:
                matches = sum(1 for t in query_terms if t in chunk.content.lower() or t in chunk.title.lower())
                score += (matches / len(query_terms)) * 0.15

            scored_chunks.append(
                RetrievedChunk(
                    title=chunk.title,
                    content=chunk.content,
                    score=round(max(0.0, min(1.0, score)), 4),
                    source=chunk.source,
                )
            )

        # Sort descending by score
        scored_chunks.sort(key=lambda x: x.score, reverse=True)

        # Filter out completely irrelevant scores (< 0.05) if higher matches exist
        filtered = [c for c in scored_chunks if c.score > 0.05]
        return filtered[:top_k] if filtered else scored_chunks[:top_k]


# ── Global Singleton ─────────────────────────────────────────────────────────

_rag_service: Optional[RAGService] = None


def get_rag_service() -> RAGService:
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
        _rag_service.build_index()
    return _rag_service
