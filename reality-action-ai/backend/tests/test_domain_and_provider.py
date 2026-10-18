"""
Regression and Verification Tests for:
1. Dynamic AI Provider Status in Health Query and REST Endpoint
2. Domain Classification and Context Grounding Isolation
3. Follow-up Chat Image Grounding:
   - TEST 1: Plant image + "Do I need any tools?" -> Plant care answer, no electronics
   - TEST 2: Electronics image + "Do I need any tools?" -> Electronics testing answer
   - TEST 3: Mechanical image + "How do I check this?" -> Belt/alignment answer
   - TEST 4: Domain Switch Protection: Plant session + "How do I check the capacitor?"
   - TEST 5: RAG Irrelevance Filter: Plant question does not retrieve/ground on electronics docs
"""

import unittest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.domain_detector import detect_domain
from app.services.rag_service import RAGService, RetrievedChunk
from app.services.analysis_service import MockAnalysisService
from app.services.session_manager import get_session_manager
from app.schemas.models import AnalysisResult, FollowUpResult
from app.config.settings import get_settings


class TestAIProviderStatus(unittest.TestCase):
    """Verify backend health exposing actual connected provider and active model."""

    def test_health_query_exposes_provider_and_model(self):
        from app.graphql.queries import Query

        q = Query()
        health = q.health()

        settings = get_settings()
        self.assertEqual(health.status, "ok")
        self.assertEqual(health.ai_mode, settings.ai_mode)
        self.assertEqual(health.provider, settings.ai_mode.strip().lower())
        
        # When AI_MODE=sarvam, model should be sarvam_model (gemma4)
        if settings.ai_mode.strip().lower() == "sarvam":
            self.assertEqual(health.provider, "sarvam")
            self.assertEqual(health.model, settings.sarvam_model)

    def test_domain_detection_visual_priority(self):
        # 1. Spider plant image description
        plant_see = "Spider plant (Chlorophytum comosum) in a ceramic pot with variegated leaves."
        dom_plant = detect_domain(plant_see, "How can I grow this like a tree in 1 year?", "Do I need any tools?")
        self.assertEqual(dom_plant, "PLANT")

        # 2. PCB electronics image description
        pcb_see = "Multilayer PCB circuit board with a burnt electrolytic capacitor and scorched traces."
        dom_pcb = detect_domain(pcb_see, "How do I diagnose this?", "Do I need any tools?")
        self.assertEqual(dom_pcb, "ELECTRONICS")

        # 3. Mechanical belt drive image description
        mech_see = "Industrial V-belt drive transmission with loose belt deflection and misaligned pulley sheaves."
        dom_mech = detect_domain(mech_see, "How do I check this?", "What tools are needed?")
        self.assertEqual(dom_mech, "MECHANICAL")


class TestRAGDomainAndRelevanceFilter(unittest.IsolatedAsyncioTestCase):
    """Verify RAG domain-awareness and strict relevance thresholding."""

    async def asyncSetUp(self):
        self.rag = RAGService(use_cloud_embeddings=False)
        self.rag.build_index()

    async def test_5_rag_irrelevance_filter_plant_rejects_electronics(self):
        """TEST 5: Plant question must NOT retrieve electronics or mechanical docs."""
        # Query asking for tools in a plant context
        chunks = await self.rag.retrieve(
            "Do I need any tools?",
            top_k=3,
            domain="PLANT",
            min_relevance_threshold=0.25,
        )
        self.assertEqual(chunks, [], "RAG should reject all engineering documents when domain is PLANT")

    async def test_rag_low_score_threshold_cutoff(self):
        """Verify that generic queries with low scores are discarded rather than returned."""
        chunks = await self.rag.retrieve(
            "What color is the sky today?",
            top_k=3,
            domain="ELECTRONICS",
            min_relevance_threshold=0.25,
        )
        self.assertEqual(chunks, [], "Completely irrelevant query must return empty list, not low-confidence chunks")

    async def test_rag_returns_matching_domain_chunks(self):
        """When query and domain match high-confidence electronics documents, return them."""
        chunks = await self.rag.retrieve(
            "discharge high voltage capacitor bleed resistor safety",
            top_k=3,
            domain="ELECTRONICS",
            min_relevance_threshold=0.25,
        )
        self.assertGreater(len(chunks), 0)
        self.assertEqual(chunks[0].source, "capacitor_discharge.md")
        self.assertEqual(chunks[0].domain, "ELECTRONICS")


class TestFollowUpContextAndDomainIsolation(unittest.IsolatedAsyncioTestCase):
    """End-to-end follow-up chat isolation tests."""

    async def asyncSetUp(self):
        self.session_mgr = get_session_manager()

    async def test_1_plant_follow_up_no_electronics(self):
        """TEST 1: Plant image + 'Do I need any tools?' must not return electronics/pulleys."""
        mock_svc = MockAnalysisService()
        session_id = "test-plant-session-001"

        # 1. Analyze plant
        res = await mock_svc.analyze(
            image_b64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            question="How can I grow this like a tree in 1 year?",
            session_id=session_id,
        )
        # Override what_i_see in session to simulate real spider plant analysis
        ctx = self.session_mgr.get_session(session_id)
        ctx["analysis"].what_i_see = "Spider plant with healthy green and white variegated leaves in a plastic nursery pot."
        ctx["domain"] = "PLANT"
        self.session_mgr.set_session(session_id, ctx)

        # 2. Ask follow-up: "Do I need any tools?"
        follow_up = await mock_svc.ask_follow_up(
            session_id=session_id,
            question="Do I need any tools?",
        )

        self.assertIsInstance(follow_up, FollowUpResult)
        ans_lower = follow_up.answer.lower()

        # MUST NOT contain electronics concepts
        forbidden = ["capacitor", "pulleys", "pulley", "motor drive", "motor drives", "electrical components", "belt tension", "voltage"]
        for f in forbidden:
            self.assertNotIn(f, ans_lower, f"Plant response improperly contained electronics term: '{f}'")

        # Grounding sources must NOT contain capacitor_discharge.md or belt_drive_tension.md
        for src in follow_up.grounding_sources:
            self.assertNotIn("capacitor_discharge.md", src)
            self.assertNotIn("belt_drive_tension.md", src)

        self.assertIn("VISUAL ANALYSIS", follow_up.grounding_sources)

    async def test_2_electronics_follow_up(self):
        """TEST 2: Electronics image + 'Do I need any tools?' can discuss diagnostic tools."""
        mock_svc = MockAnalysisService()
        session_id = "test-pcb-session-002"

        # 1. Analyze PCB
        res = await mock_svc.analyze(
            image_b64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            question="How do I diagnose this?",
            session_id=session_id,
        )
        ctx = self.session_mgr.get_session(session_id)
        ctx["analysis"].what_i_see = "Damaged PCB board with burnt resistor R14 and bulging capacitor C2."
        ctx["domain"] = "ELECTRONICS"
        self.session_mgr.set_session(session_id, ctx)

        # 2. Ask follow-up: "Do I need any tools?"
        follow_up = await mock_svc.ask_follow_up(
            session_id=session_id,
            question="Do I need any tools?",
        )
        self.assertIsInstance(follow_up, FollowUpResult)

    async def test_3_mechanical_follow_up(self):
        """TEST 3: Mechanical image + 'How do I check this?' -> alignment/tension."""
        mock_svc = MockAnalysisService()
        session_id = "test-mech-session-003"

        res = await mock_svc.analyze(
            image_b64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            question="How do I check this?",
            session_id=session_id,
        )
        ctx = self.session_mgr.get_session(session_id)
        ctx["analysis"].what_i_see = "Industrial V-belt drive transmission with dual pulley sheaves and loose drive belt."
        ctx["domain"] = "MECHANICAL"
        self.session_mgr.set_session(session_id, ctx)

        follow_up = await mock_svc.ask_follow_up(
            session_id=session_id,
            question="How do I check this?",
        )
        ans_lower = follow_up.answer.lower()
        self.assertTrue(
            "belt" in ans_lower or "pulley" in ans_lower or "alignment" in ans_lower or "tension" in ans_lower,
            f"Expected mechanical terms in answer: {follow_up.answer}",
        )

    async def test_4_domain_switch_protection(self):
        """TEST 4: Plant session + 'How do I check the capacitor?' -> clarifies plant subject."""
        mock_svc = MockAnalysisService()
        session_id = "test-switch-session-004"

        res = await mock_svc.analyze(
            image_b64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            question="What plant is this?",
            session_id=session_id,
        )
        ctx = self.session_mgr.get_session(session_id)
        ctx["analysis"].what_i_see = "Spider plant with green leaves in a ceramic pot."
        ctx["domain"] = "PLANT"
        self.session_mgr.set_session(session_id, ctx)

        follow_up = await mock_svc.ask_follow_up(
            session_id=session_id,
            question="How do I check the capacitor?",
        )
        ans_lower = follow_up.answer.lower()
        self.assertIn("plant", ans_lower)
        self.assertTrue(
            "no capacitor" in ans_lower or "not present" in ans_lower or "no capacitors" in ans_lower,
            f"Expected domain switch protection clarification: {follow_up.answer}",
        )
        self.assertNotIn("capacitor_discharge.md", follow_up.grounding_sources)


if __name__ == "__main__":
    unittest.main()
