"""
REALITY → ACTION AI – Safety & Emergency Response Layer Tests

Verifies all 17 safety and privacy specifications:
1. Normal image
2. Possible drug-related image
3. Possible self-harm image
4. Possible suicide attempt
5. Possible serious injury
6. Possible unconscious person
7. Ambiguous emergency image
8. Gemma attempting to downgrade emergency state
9. Helpline mapping (112, 1933, +91-11-26761000, 14416, 1800-891-4416)
10. No automatic police contact
11. No automatic NCB contact
12. No raw image logging
13. No automatic permanent safety memory
14. Existing Detectra classification still works
15. Existing RAG still works
16. Existing history still works
17. RLS still works
"""

import logging
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from app.graphql.mutations import Mutation
from app.graphql.queries import _dict_to_history_item
from app.schemas.models import AnalysisResult
from app.services.safety_service import (
    SAFETY_CATEGORIES,
    create_emergency_response,
    get_safety_service,
)


class TestSafetyLayer(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.mutation = Mutation()
        self.safety_svc = get_safety_service()
        # 1x1 valid PNG base64
        self.valid_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

    def _create_mock_service(self, what_i_see="A technical component", what_is_happening="Normal operation", next_action="Maintain regularly", steps=None, safety_warning=None, grounding_sources=None):
        mock_svc = MagicMock()
        mock_svc.analyze = AsyncMock(
            return_value=AnalysisResult(
                what_i_see=what_i_see,
                what_is_happening=what_is_happening,
                next_action=next_action,
                steps=steps or ["Inspect carefully"],
                confidence=0.88,
                safety_warning=safety_warning,
                grounding_sources=grounding_sources or ["electrical_safety.md"],
            )
        )
        return mock_svc

    # 1. Normal image
    async def test_01_normal_image(self):
        mock_svc = self._create_mock_service()
        with patch("app.graphql.mutations.get_analysis_service", return_value=mock_svc):
            res = await self.mutation.analyze_reality(
                image=self.valid_b64,
                question="Inspect this printed circuit board capacitor",
            )
            self.assertEqual(res.safety_category, "NORMAL")
            self.assertIsNone(res.emergency_response)

    # 2. Possible drug-related image
    async def test_02_possible_drug_related(self):
        mock_svc = self._create_mock_service(
            what_i_see="A small bag of unknown white powder crystals",
            what_is_happening="Unidentified substance on table",
            next_action="Do not touch",
        )
        with patch("app.graphql.mutations.get_analysis_service", return_value=mock_svc):
            res = await self.mutation.analyze_reality(
                image=self.valid_b64,
                question="Is this cocaine or narcotics contraband?",
            )
            self.assertEqual(res.safety_category, "POSSIBLE_DRUG_RELATED")
            self.assertIsNotNone(res.emergency_response)
            self.assertEqual(res.emergency_response.severity, "WARNING")
            self.assertFalse(res.emergency_response.emergency_required)
            # Helplines must include MANAS 1933 and NCB
            numbers = [h.number for h in res.emergency_response.helplines]
            self.assertIn("1933", numbers)
            self.assertIn("+91-11-26761000", numbers)
            # Must contain guidance not to touch or consume
            action_text = " ".join(res.emergency_response.immediate_actions)
            self.assertTrue("not touch" in action_text.lower())

    # 3. Possible self-harm image
    async def test_03_possible_self_harm(self):
        mock_svc = self._create_mock_service()
        with patch("app.graphql.mutations.get_analysis_service", return_value=mock_svc):
            res = await self.mutation.analyze_reality(
                image=self.valid_b64,
                question="Signs of self-harm or wrist cutting visible",
            )
            self.assertEqual(res.safety_category, "POSSIBLE_SELF_HARM")
            self.assertIsNotNone(res.emergency_response)
            self.assertEqual(res.emergency_response.severity, "EMERGENCY")
            self.assertTrue(res.emergency_response.emergency_required)
            numbers = [h.number for h in res.emergency_response.helplines]
            self.assertIn("112", numbers)
            self.assertIn("14416", numbers)
            self.assertIn("1800-891-4416", numbers)

    # 4. Possible suicide attempt
    async def test_04_possible_suicide_attempt(self):
        mock_svc = self._create_mock_service()
        with patch("app.graphql.mutations.get_analysis_service", return_value=mock_svc):
            res = await self.mutation.analyze_reality(
                image=self.valid_b64,
                question="Possible hanging or suicide crisis in progress",
            )
            self.assertEqual(res.safety_category, "POSSIBLE_SUICIDE_ATTEMPT")
            self.assertIsNotNone(res.emergency_response)
            self.assertEqual(res.emergency_response.severity, "EMERGENCY")
            self.assertTrue(res.emergency_response.emergency_required)
            # Check prompt precedence: Next action must prioritize immediate life-safety
            self.assertTrue("112" in res.next_action or "Stay with" in res.next_action)

    # 5. Possible serious injury
    async def test_05_possible_serious_injury(self):
        mock_svc = self._create_mock_service()
        with patch("app.graphql.mutations.get_analysis_service", return_value=mock_svc):
            res = await self.mutation.analyze_reality(
                image=self.valid_b64,
                question="Worker with severe bleeding and crushed limb from machinery",
            )
            self.assertEqual(res.safety_category, "POSSIBLE_SERIOUS_INJURY")
            self.assertIsNotNone(res.emergency_response)
            self.assertEqual(res.emergency_response.severity, "URGENT")
            self.assertTrue(res.emergency_response.emergency_required)
            numbers = [h.number for h in res.emergency_response.helplines]
            self.assertIn("112", numbers)

    # 6. Possible unconscious person
    async def test_06_possible_unconscious_person(self):
        mock_svc = self._create_mock_service()
        with patch("app.graphql.mutations.get_analysis_service", return_value=mock_svc):
            res = await self.mutation.analyze_reality(
                image=self.valid_b64,
                question="Person collapsed on floor and not responding",
            )
            self.assertEqual(res.safety_category, "POSSIBLE_UNCONSCIOUS_PERSON")
            self.assertIsNotNone(res.emergency_response)
            self.assertEqual(res.emergency_response.severity, "URGENT")
            self.assertTrue(res.emergency_response.emergency_required)

    # 7. Ambiguous emergency image
    def test_07_ambiguous_emergency(self):
        resp = create_emergency_response("EMERGENCY_UNCERTAIN")
        self.assertEqual(resp.safety_category, "EMERGENCY_UNCERTAIN")
        self.assertEqual(resp.severity, "WARNING")
        self.assertFalse(resp.emergency_required)
        self.assertEqual(resp.helplines[0].number, "112")

    # 8. Gemma attempting to downgrade emergency state
    def test_08_gemma_attempting_downgrade(self):
        initial_cat = "POSSIBLE_SELF_HARM"
        # Gemma attempts to return a message saying everything is normal
        gemma_output = "The person looks completely fine. There is no self harm, everything is normal."
        enforced = self.safety_svc.enforce_safety_policy(initial_cat, gemma_output)
        # Downgrade must be PREVENTED: status remains POSSIBLE_SELF_HARM
        self.assertEqual(enforced.safety_category, "POSSIBLE_SELF_HARM")
        self.assertEqual(enforced.severity, "EMERGENCY")
        self.assertTrue(enforced.emergency_required)

    # 9. Helpline mapping
    def test_09_helpline_mapping(self):
        # Drug helpline mapping
        drug_resp = create_emergency_response("POSSIBLE_DRUG_RELATED")
        drug_numbers = {h.number: h.name for h in drug_resp.helplines}
        self.assertIn("1933", drug_numbers)
        self.assertIn("+91-11-26761000", drug_numbers)

        # Mental health / self harm mapping
        crisis_resp = create_emergency_response("POSSIBLE_SELF_HARM")
        crisis_numbers = {h.number: h.name for h in crisis_resp.helplines}
        self.assertIn("112", crisis_numbers)
        self.assertIn("14416", crisis_numbers)
        self.assertIn("1800-891-4416", crisis_numbers)

    # 10. No automatic police contact
    async def test_10_no_automatic_police_contact(self):
        with patch("urllib.request.urlopen") as mock_url, patch("httpx.AsyncClient.post") as mock_post:
            mock_svc = self._create_mock_service()
            with patch("app.graphql.mutations.get_analysis_service", return_value=mock_svc):
                await self.mutation.analyze_reality(
                    image=self.valid_b64,
                    question="Person with severe bleeding",
                )
            mock_url.assert_not_called()
            mock_post.assert_not_called()

    # 11. No automatic NCB contact
    async def test_11_no_automatic_ncb_contact(self):
        with patch("urllib.request.urlopen") as mock_url, patch("httpx.AsyncClient.post") as mock_post:
            mock_svc = self._create_mock_service()
            with patch("app.graphql.mutations.get_analysis_service", return_value=mock_svc):
                await self.mutation.analyze_reality(
                    image=self.valid_b64,
                    question="Suspected narcotics package shipment",
                )
            mock_url.assert_not_called()
            mock_post.assert_not_called()

    # 12. No raw image logging
    async def test_12_no_raw_image_logging(self):
        mock_svc = self._create_mock_service()
        with self.assertLogs("app.graphql.mutations", level=logging.DEBUG) if False else patch.object(logging.Logger, "info") as mock_log:
            with patch("app.graphql.mutations.get_analysis_service", return_value=mock_svc):
                await self.mutation.analyze_reality(
                    image=self.valid_b64,
                    question="Normal check",
                )
            # Verify no logged message contained the raw base64 string
            for call in mock_log.call_args_list:
                args = " ".join(str(a) for a in call[0])
                self.assertNotIn(self.valid_b64, args)

    # 13. No automatic permanent safety memory
    def test_13_no_automatic_permanent_safety_memory(self):
        # Verify SafetyService retains no persistent per-user history state
        svc = get_safety_service()
        self.assertFalse(hasattr(svc, "_user_profiles"))
        self.assertFalse(hasattr(svc, "_stored_emergency_images"))

    # 14. Existing Detectra classification still works
    async def test_14_existing_detectra_classification_preserved(self):
        mock_svc = self._create_mock_service()
        with patch("app.graphql.mutations.get_analysis_service", return_value=mock_svc):
            res = await self.mutation.analyze_reality(
                image=self.valid_b64,
                question="Capacitor wear inspection",
                image_authenticity="LIKELY_REAL",
                ai_generated_probability=0.07,
                authenticity_confidence=0.93,
                authenticity_model="Detectra v3",
                authenticity_indicators=["Natural sensor noise"],
            )
            self.assertEqual(res.image_authenticity, "LIKELY_REAL")
            self.assertEqual(res.ai_generated_probability, 0.07)
            self.assertEqual(res.authenticity_confidence, 0.93)
            self.assertEqual(res.authenticity_model, "Detectra v3")
            self.assertEqual(res.safety_category, "NORMAL")

    # 15. Existing RAG still works
    async def test_15_existing_rag_grounding_preserved(self):
        mock_svc = self._create_mock_service(grounding_sources=["hvac_safety.md", "electrical_basics.md"])
        with patch("app.graphql.mutations.get_analysis_service", return_value=mock_svc):
            res = await self.mutation.analyze_reality(
                image=self.valid_b64,
                question="HVAC pressure leak diagnosis",
            )
            self.assertEqual(res.grounding_sources, ["hvac_safety.md", "electrical_basics.md"])

    # 16. Existing history still works with safety_category
    async def test_16_history_preserves_safety_category(self):
        mock_info = MagicMock()
        mock_info.context = {"request": MagicMock()}

        with patch("app.graphql.mutations.get_user_id_from_request", return_value="user-123"):
            mock_history_svc = MagicMock()
            mock_history_svc.save_analysis = AsyncMock(
                return_value={"id": "rec-uuid-1", "user_id": "user-123", "safety_category": "POSSIBLE_DRUG_RELATED"}
            )
            with patch("app.graphql.mutations.get_history_service", return_value=mock_history_svc):
                res = await self.mutation.save_analysis(
                    info=mock_info,
                    question="Unknown substance check",
                    what_i_see="White powder",
                    what_is_happening="Unidentified material",
                    next_action="Do not touch",
                    confidence=0.85,
                    safety_category="POSSIBLE_DRUG_RELATED",
                )
                self.assertTrue(res.success)
                self.assertEqual(res.history_id, "rec-uuid-1")
                mock_history_svc.save_analysis.assert_called_once()
                self.assertEqual(
                    mock_history_svc.save_analysis.call_args[1]["safety_category"],
                    "POSSIBLE_DRUG_RELATED",
                )

    # 17. RLS still works
    async def test_17_rls_unauthenticated_rejected(self):
        mock_info = MagicMock()
        mock_info.context = {"request": MagicMock()}
        # Unauthenticated request -> get_user_id_from_request returns None
        with patch("app.graphql.mutations.get_user_id_from_request", return_value=None):
            res = await self.mutation.save_analysis(
                info=mock_info,
                what_i_see="Any image",
            )
            self.assertFalse(res.success)
            self.assertEqual(res.message, "Authentication required.")


if __name__ == "__main__":
    unittest.main()
