"""
REALITY → ACTION AI – Authenticity Detector & Backend Integration Tests

Verifies:
1. Probability validation (<0, >1, NaN, Inf rejected; valid values accepted).
2. Authoritative detector results: Gemma/Sarvam output CANNOT overwrite detector probability.
3. Authenticity context injection into AI prompts.
4. Backward compatibility when authenticity fields are None / null.
5. History persistence of authenticity metadata.
"""

import math
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from app.graphql.mutations import Mutation
from app.graphql.queries import _dict_to_history_item
from app.graphql.schema import AnalysisHistoryItemType, AnalysisResultType
from app.schemas.models import AnalysisResult


class TestAuthenticityValidation(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.mutation = Mutation()
        # Valid 1x1 png base64
        self.valid_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

    async def test_valid_probabilities_accepted(self):
        mock_service = MagicMock()
        mock_service.analyze = AsyncMock(
            return_value=AnalysisResult(
                what_i_see="A real circuit board",
                what_is_happening="Normal operation",
                next_action="Continue monitoring",
                steps=["Check voltage"],
                confidence=0.9,
            )
        )

        with patch("app.graphql.mutations.get_analysis_service", return_value=mock_service):
            # Test 0.08 (Likely Real)
            res1 = await self.mutation.analyze_reality(
                image=self.valid_b64,
                image_authenticity="LIKELY_REAL",
                ai_generated_probability=0.08,
                authenticity_confidence=0.92,
                authenticity_model="Detectra v3",
            )
            self.assertEqual(res1.image_authenticity, "LIKELY_REAL")
            self.assertEqual(res1.ai_generated_probability, 0.08)
            self.assertEqual(res1.authenticity_confidence, 0.92)
            self.assertEqual(res1.authenticity_model, "Detectra v3")

            # Test 0.95 (Likely AI)
            res2 = await self.mutation.analyze_reality(
                image=self.valid_b64,
                image_authenticity="LIKELY_AI_GENERATED",
                ai_generated_probability=0.95,
                authenticity_confidence=0.95,
                authenticity_model="Detectra v3",
            )
            self.assertEqual(res2.image_authenticity, "LIKELY_AI_GENERATED")
            self.assertEqual(res2.ai_generated_probability, 0.95)

    async def test_invalid_probabilities_rejected(self):
        mock_service = MagicMock()
        mock_service.analyze = AsyncMock()

        with patch("app.graphql.mutations.get_analysis_service", return_value=mock_service):
            # Probability < 0
            with self.assertRaises(ValueError):
                await self.mutation.analyze_reality(
                    image=self.valid_b64,
                    ai_generated_probability=-0.1,
                )

            # Probability > 1
            with self.assertRaises(ValueError):
                await self.mutation.analyze_reality(
                    image=self.valid_b64,
                    ai_generated_probability=1.05,
                )

            # Probability NaN
            with self.assertRaises(ValueError):
                await self.mutation.analyze_reality(
                    image=self.valid_b64,
                    ai_generated_probability=float("nan"),
                )

            # Probability Infinity
            with self.assertRaises(ValueError):
                await self.mutation.analyze_reality(
                    image=self.valid_b64,
                    ai_generated_probability=float("inf"),
                )


class TestGemmaCannotOverwriteDetector(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.mutation = Mutation()
        self.valid_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

    async def test_detector_values_are_authoritative(self):
        """Even if Gemma generates text speculating otherwise, the numerical detector result stands."""
        mock_service = MagicMock()
        mock_service.analyze = AsyncMock(
            return_value=AnalysisResult(
                what_i_see="This looks like an AI rendering of a component.",
                what_is_happening="Synthetic rendering artifact.",
                next_action="Verify physical presence.",
                steps=["Check physical asset"],
                confidence=0.5,
            )
        )

        with patch("app.graphql.mutations.get_analysis_service", return_value=mock_service):
            result = await self.mutation.analyze_reality(
                image=self.valid_b64,
                image_authenticity="LIKELY_REAL",
                ai_generated_probability=0.12,
                authenticity_confidence=0.88,
                authenticity_model="Detectra v3",
            )

            # Detector result is authoritative
            self.assertEqual(result.image_authenticity, "LIKELY_REAL")
            self.assertEqual(result.ai_generated_probability, 0.12)
            self.assertEqual(result.authenticity_confidence, 0.88)
            self.assertEqual(result.authenticity_model, "Detectra v3")

            # Check that context was passed to Gemma
            _, kwargs = mock_service.analyze.call_args
            auth_ctx = kwargs.get("authenticity_context")
            self.assertIsNotNone(auth_ctx)
            self.assertIn("AUTHENTICITY ASSESSMENT", auth_ctx)
            self.assertIn("Status: LIKELY_REAL", auth_ctx)
            self.assertIn("0.12", auth_ctx)


class TestAuthenticityBackwardCompatibility(unittest.TestCase):
    def test_history_row_without_authenticity_fields(self):
        """Legacy history rows without authenticity columns must load without error."""
        legacy_row = {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "question": "Inspect this capacitor",
            "what_i_see": "A capacitor",
            "what_is_happening": "Bulging top",
            "next_action": "Replace capacitor",
            "steps": ["Desolder", "Replace"],
            "confidence": 0.88,
            "safety_warning": "High voltage",
            "image_url": None,
            "created_at": "2026-10-18T00:00:00Z",
            # authenticity fields are missing / NULL
        }

        item: AnalysisHistoryItemType = _dict_to_history_item(legacy_row)
        self.assertEqual(item.id, "123e4567-e89b-12d3-a456-426614174000")
        self.assertIsNone(item.image_authenticity)
        self.assertIsNone(item.ai_generated_probability)
        self.assertIsNone(item.authenticity_confidence)
        self.assertIsNone(item.authenticity_model)
        self.assertIsNone(item.authenticity_indicators)

    def test_history_row_with_authenticity_fields(self):
        """New rows with authenticity columns map cleanly."""
        new_row = {
            "id": "123e4567-e89b-12d3-a456-426614174001",
            "question": "Check board",
            "what_i_see": "A PCB",
            "what_is_happening": "Normal",
            "next_action": "Power on",
            "steps": ["Turn switch"],
            "confidence": 0.95,
            "safety_warning": None,
            "image_url": None,
            "created_at": "2026-10-18T01:00:00Z",
            "image_authenticity": "LIKELY_AI_GENERATED",
            "ai_generated_probability": "0.91",
            "authenticity_confidence": "0.91",
            "authenticity_model": "Detectra v3",
            "authenticity_indicators": ["Model-based classification"],
        }

        item: AnalysisHistoryItemType = _dict_to_history_item(new_row)
        self.assertEqual(item.image_authenticity, "LIKELY_AI_GENERATED")
        self.assertAlmostEqual(item.ai_generated_probability, 0.91)
        self.assertAlmostEqual(item.authenticity_confidence, 0.91)
        self.assertEqual(item.authenticity_model, "Detectra v3")
        self.assertEqual(item.authenticity_indicators, ["Model-based classification"])


if __name__ == "__main__":
    unittest.main()
