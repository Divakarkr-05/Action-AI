"""
Unit tests for Lightweight RAG Service in REALITY → ACTION AI.

Tests cover:
  1. Document loading
  2. Markdown chunking
  3. Cosine similarity
  4. Retrieval ranking across domain topics
  5. Empty / invalid query handling
  6. Empty / missing document directory handling
  7. Mock AI mode integration with grounding sources
"""

import asyncio
import tempfile
import unittest
from pathlib import Path

from app.schemas.models import AnalysisResult, FollowUpResult
from app.services.analysis_service import MockAnalysisService
from app.services.rag_service import (
    KNOWLEDGE_DIR,
    KnowledgeChunk,
    RAGService,
    RetrievedChunk,
    chunk_markdown_document,
    cosine_similarity,
)


class TestRAGCosineSimilarity(unittest.TestCase):
    """Tests for vector cosine similarity and edge cases."""

    def test_identical_vectors(self):
        v1 = [1.0, 2.0, 3.0]
        v2 = [1.0, 2.0, 3.0]
        sim = cosine_similarity(v1, v2)
        self.assertAlmostEqual(sim, 1.0, places=5)

    def test_orthogonal_vectors(self):
        v1 = [1.0, 0.0]
        v2 = [0.0, 1.0]
        sim = cosine_similarity(v1, v2)
        self.assertAlmostEqual(sim, 0.0, places=5)

    def test_opposing_vectors(self):
        v1 = [1.0, 0.0]
        v2 = [-1.0, 0.0]
        sim = cosine_similarity(v1, v2)
        self.assertAlmostEqual(sim, -1.0, places=5)

    def test_empty_or_mismatched_vectors(self):
        self.assertEqual(cosine_similarity([], []), 0.0)
        self.assertEqual(cosine_similarity([1.0], [1.0, 2.0]), 0.0)
        self.assertEqual(cosine_similarity([0.0, 0.0], [1.0, 1.0]), 0.0)


class TestRAGChunking(unittest.TestCase):
    """Tests for Markdown chunking and section extraction."""

    def test_markdown_chunking_with_headers(self):
        sample_md = """# Electrical Safety Protocol

General introduction to high voltage hazards.

## Lockout / Tagout (LOTO)
Ensure circuit breaker is locked in open position before maintenance.
Verify zero voltage state using a multimeter.

## Arc Flash Boundaries
Wear Category 4 arc flash face shield and flash suit when within boundary.
"""
        chunks = chunk_markdown_document(sample_md, "electrical_safety.md")
        self.assertGreaterEqual(len(chunks), 2)

        # First section check
        titles = [c.title for c in chunks]
        self.assertTrue(any("Lockout / Tagout" in t for t in titles))
        self.assertTrue(any("Arc Flash Boundaries" in t for t in titles))

        # Check sources and content
        for chunk in chunks:
            self.assertEqual(chunk.source, "electrical_safety.md")
            self.assertFalse(chunk.content.startswith("#"))
            self.assertGreater(len(chunk.content), 10)

    def test_single_section_markdown(self):
        sample_md = "# Basic Notice\n\nAlways de-energize the machine before servicing."
        chunks = chunk_markdown_document(sample_md, "notice.md")
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0].source, "notice.md")
        self.assertIn("Always de-energize", chunks[0].content)


class TestRAGDocumentLoading(unittest.TestCase):
    """Tests for loading documents from the knowledge directory."""

    def setUp(self):
        self.rag = RAGService(use_cloud_embeddings=False)

    def test_knowledge_directory_exists(self):
        self.assertTrue(KNOWLEDGE_DIR.exists(), f"Directory not found: {KNOWLEDGE_DIR}")
        md_files = list(KNOWLEDGE_DIR.glob("*.md"))
        self.assertGreaterEqual(len(md_files), 5, "Expected at least 5 markdown knowledge files.")

    def test_load_documents_populates_chunks(self):
        chunks = self.rag.load_documents()
        self.assertGreater(len(chunks), 5)
        sources = {c.source for c in chunks}

        # Check required MVP knowledge coverage
        expected_sources = {
            "electrical_safety.md",
            "capacitor_discharge.md",
            "belt_drive_tension.md",
            "hvac_troubleshooting.md",
            "rj45_network_termination.md",
        }
        for expected in expected_sources:
            self.assertIn(expected, sources, f"Missing expected knowledge source: {expected}")


class TestRAGRetrieval(unittest.IsolatedAsyncioTestCase):
    """Tests for retrieval ranking, query handling, and edge cases."""

    async def asyncSetUp(self):
        self.rag = RAGService(use_cloud_embeddings=False)
        self.rag.build_index()

    async def test_retrieval_returns_structured_chunks(self):
        results = await self.rag.retrieve("capacitor discharge safety bleed resistor", top_k=3)
        self.assertGreater(len(results), 0)
        self.assertLessEqual(len(results), 3)

        first = results[0]
        self.assertIsInstance(first, RetrievedChunk)
        self.assertTrue(hasattr(first, "title"))
        self.assertTrue(hasattr(first, "content"))
        self.assertTrue(hasattr(first, "score"))
        self.assertTrue(hasattr(first, "source"))
        self.assertGreaterEqual(first.score, 0.0)
        self.assertLessEqual(first.score, 1.0)

    async def test_retrieval_ranking_capacitor(self):
        results = await self.rag.retrieve("discharge high voltage capacitor bleed resistor", top_k=3)
        self.assertGreater(len(results), 0)
        # Top result should be from capacitor_discharge.md
        self.assertEqual(results[0].source, "capacitor_discharge.md")

    async def test_retrieval_ranking_belt_tension(self):
        results = await self.rag.retrieve("pulley belt drive tension deflection alignment", top_k=3)
        self.assertGreater(len(results), 0)
        self.assertEqual(results[0].source, "belt_drive_tension.md")

    async def test_retrieval_ranking_hvac(self):
        results = await self.rag.retrieve("HVAC error code E03 refrigerant pressure compressor lockout", top_k=3)
        self.assertGreater(len(results), 0)
        self.assertEqual(results[0].source, "hvac_troubleshooting.md")

    async def test_retrieval_ranking_rj45(self):
        results = await self.rag.retrieve("RJ45 ethernet cable crimping T568B pinout twisted pair", top_k=3)
        self.assertGreater(len(results), 0)
        self.assertEqual(results[0].source, "rj45_network_termination.md")

    async def test_retrieval_ranking_electrical(self):
        results = await self.rag.retrieve("lockout tagout LOTO test before touch multimeter CAT rating", top_k=3)
        self.assertGreater(len(results), 0)
        self.assertEqual(results[0].source, "electrical_safety.md")

    async def test_empty_and_whitespace_query(self):
        empty_res = await self.rag.retrieve("", top_k=3)
        self.assertEqual(empty_res, [])

        whitespace_res = await self.rag.retrieve("    \t\n  ", top_k=3)
        self.assertEqual(whitespace_res, [])

    async def test_no_documents_handling(self):
        with tempfile.TemporaryDirectory() as empty_dir:
            empty_rag = RAGService(knowledge_dir=Path(empty_dir), use_cloud_embeddings=False)
            empty_rag.build_index()
            res = await empty_rag.retrieve("capacitor discharge", top_k=3)
            self.assertEqual(res, [])

    async def test_missing_directory_handling(self):
        missing_dir = Path(tempfile.gettempdir()) / "nonexistent_knowledge_path_abc123"
        missing_rag = RAGService(knowledge_dir=missing_dir, use_cloud_embeddings=False)
        missing_rag.build_index()
        res = await missing_rag.retrieve("electrical test", top_k=3)
        self.assertEqual(res, [])


class TestMockAIWithGrounding(unittest.IsolatedAsyncioTestCase):
    """Tests that MockAnalysisService produces valid grounding_sources."""

    async def test_mock_analysis_returns_grounding_sources(self):
        mock_svc = MockAnalysisService()
        result = await mock_svc.analyze(
            image_b64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            question="How do I safely discharge this capacitor?",
        )
        self.assertIsInstance(result, AnalysisResult)
        self.assertTrue(hasattr(result, "grounding_sources"))
        self.assertIsInstance(result.grounding_sources, list)
        self.assertGreaterEqual(len(result.grounding_sources), 1)

    async def test_mock_follow_up_returns_grounding_sources(self):
        mock_svc = MockAnalysisService()
        result = await mock_svc.ask_follow_up(
            session_id="session-test",
            question="What is the proper belt tension deflection formula?",
        )
        self.assertIsInstance(result, FollowUpResult)
        self.assertTrue(hasattr(result, "grounding_sources"))
        self.assertIsInstance(result.grounding_sources, list)
        self.assertGreaterEqual(len(result.grounding_sources), 1)


if __name__ == "__main__":
    unittest.main()
