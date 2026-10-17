"""
Tests for Sarvam AI Integration in REALITY → ACTION AI.

Tests cover:
  1. Settings loading of Sarvam config (api_key, model, base_url).
  2. Factory resolution (AI_MODE=sarvam -> SarvamService).
  3. Response JSON parsing and fallback extraction.
  4. Follow-up response parsing.
  5. Live API test with Sarvam AI endpoint (if SARVAM_API_KEY is configured).
"""

import asyncio
import os
import unittest
from unittest.mock import patch

from app.config.settings import Settings, get_settings
from app.services.analysis_service import get_analysis_service
from app.services.sarvam_service import SarvamService, get_sarvam_service


class TestSarvamSettingsAndFactory(unittest.TestCase):
    """Test configuration loading and dependency injection factory."""

    def test_settings_has_sarvam_fields(self):
        settings = Settings()
        self.assertTrue(hasattr(settings, "sarvam_api_key"))
        self.assertTrue(hasattr(settings, "sarvam_model"))
        self.assertTrue(hasattr(settings, "sarvam_base_url"))
        self.assertEqual(settings.sarvam_model, "gemma4")
        self.assertEqual(settings.sarvam_base_url, "https://api.sarvam.ai/v2")

    def test_factory_returns_sarvam_service_when_configured(self):
        with patch.dict(os.environ, {"AI_MODE": "sarvam", "SARVAM_API_KEY": "test-key"}):
            get_settings.cache_clear()
            service = get_analysis_service()
            self.assertIsInstance(service, SarvamService)
            self.assertEqual(service._api_key, "test-key")
        get_settings.cache_clear()


class TestSarvamParsers(unittest.TestCase):
    """Test JSON response parsing and fallback mechanisms."""

    def setUp(self):
        self.service = SarvamService(api_key="dummy-key", model="gemma4")

    def test_parse_valid_analysis_json(self):
        raw = """```json
{
  "what_i_see": "A damaged PCB capacitor with residue.",
  "what_is_happening": "Electrolyte leak due to thermal stress.",
  "next_action": "Disconnect power immediately.",
  "steps": [
    "Step 1: Power off.",
    "Step 2: Discharge capacitor."
  ],
  "confidence": 0.92,
  "safety_warning": "High voltage charge hazard."
}
```"""
        result = self.service._parse_analysis_response(raw)
        self.assertEqual(result.what_i_see, "A damaged PCB capacitor with residue.")
        self.assertEqual(result.what_is_happening, "Electrolyte leak due to thermal stress.")
        self.assertEqual(result.next_action, "Disconnect power immediately.")
        self.assertEqual(len(result.steps), 2)
        self.assertEqual(result.confidence, 0.92)
        self.assertEqual(result.safety_warning, "High voltage charge hazard.")

    def test_parse_analysis_fallback_regex(self):
        raw = """Here is the result:
"what_i_see": "Loose wire connector",
"what_is_happening": "Wire has backed out of the terminal screw",
"next_action": "Tighten the terminal screw",
"steps": ["Step 1: Disconnect power", "Step 2: Re-insert wire"],
"confidence": 0.88,
"safety_warning": "Ensure circuit breaker is off"
"""
        result = self.service._parse_analysis_response(raw)
        self.assertEqual(result.what_i_see, "Loose wire connector")
        self.assertEqual(result.next_action, "Tighten the terminal screw")
        self.assertEqual(len(result.steps), 2)
        self.assertEqual(result.confidence, 0.88)

    def test_parse_follow_up_response(self):
        raw = """```json
{
  "answer": "Yes, turning off the breaker ensures safe handling.",
  "steps": ["Locate breaker panel", "Switch off circuit #4"],
  "confidence": 0.95,
  "safety_warning": "Verify with non-contact voltage tester"
}
```"""
        result = self.service._parse_follow_up_response(raw)
        self.assertEqual(result.answer, "Yes, turning off the breaker ensures safe handling.")
        self.assertEqual(len(result.steps), 2)
        self.assertEqual(result.confidence, 0.95)
        self.assertEqual(result.safety_warning, "Verify with non-contact voltage tester")


class TestSarvamLiveAPI(unittest.IsolatedAsyncioTestCase):
    """Live API tests against Sarvam AI endpoints using configured credentials."""

    async def test_live_analysis_and_follow_up(self):
        get_settings.cache_clear()
        settings = get_settings()
        if not settings.sarvam_api_key:
            self.skipTest("SARVAM_API_KEY is not configured in backend/.env")

        service = SarvamService(
            api_key=settings.sarvam_api_key,
            model=settings.sarvam_model,
            base_url=settings.sarvam_base_url,
        )

        # 1x1 test png base64
        test_png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

        # Test analyze
        result = await service.analyze(
            image_b64=test_png,
            question="What do you see in this image and what action should be taken?",
            session_id="test-session-123",
        )
        self.assertTrue(len(result.what_i_see) > 0)
        self.assertTrue(len(result.what_is_happening) > 0)
        self.assertTrue(len(result.next_action) > 0)
        self.assertTrue(len(result.steps) >= 1)
        self.assertGreaterEqual(result.confidence, 0.0)
        self.assertLessEqual(result.confidence, 1.0)

        # Test follow-up
        follow_up = await service.ask_follow_up(
            session_id="test-session-123",
            question="Is there any electrical risk?",
        )
        self.assertTrue(len(follow_up.answer) > 0)
        self.assertGreaterEqual(follow_up.confidence, 0.0)


if __name__ == "__main__":
    unittest.main()
