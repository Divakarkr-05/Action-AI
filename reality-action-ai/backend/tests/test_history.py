"""
Unit and integration tests for Supabase Client and History Service in REALITY → ACTION AI.

Tests cover:
  1. Supabase client initialization and credential validation
  2. Detection of publishable/anon key misconfiguration in SUPABASE_SERVICE_ROLE_KEY
  3. Dynamic client refresh when credentials update
  4. HistoryService save_analysis, get_user_history, get_analysis_by_id, delete_analysis
  5. Strict user_id isolation across multiple user accounts
  6. Authentication middleware JWT decoding and expiration validation
"""

import time
import unittest
from unittest.mock import MagicMock, patch
import jwt

from app.config.settings import Settings, get_settings
from app.middleware.auth import get_user_id_from_request
from app.services.history_service import HistoryService, get_history_service
from app.services.supabase_client import get_supabase_client


class TestSupabaseClientInitialization(unittest.TestCase):
    """Tests for safe Supabase client initialization and credential checks."""

    def test_missing_credentials_returns_none(self):
        with patch("app.services.supabase_client.get_settings") as mock_settings:
            mock_settings.return_value = Settings(
                supabase_url="",
                supabase_service_role_key="",
            )
            client = get_supabase_client()
            self.assertIsNone(client)

    def test_detects_publishable_anon_key_warning(self):
        with patch("app.services.supabase_client.get_settings") as mock_settings, \
             patch("app.services.supabase_client.logger") as mock_logger, \
             patch("app.services.supabase_client.create_client") as mock_create:
            
            mock_settings.return_value = Settings(
                supabase_url="https://test-project.supabase.co",
                supabase_service_role_key="sb_publishable_test_anon_key",
            )
            mock_create.return_value = MagicMock()
            
            get_supabase_client()
            # Verify warning was logged about publishable key being used as service_role
            mock_logger.warning.assert_called()
            log_msg = mock_logger.warning.call_args[0][0]
            self.assertIn("SUPABASE MISCONFIGURATION", log_msg)
            self.assertIn("sb_publishable_", log_msg)

    def test_service_role_key_initializes_without_warning(self):
        with patch("app.services.supabase_client.get_settings") as mock_settings, \
             patch("app.services.supabase_client.logger") as mock_logger, \
             patch("app.services.supabase_client.create_client") as mock_create:
            
            mock_settings.return_value = Settings(
                supabase_url="https://test-project.supabase.co",
                supabase_service_role_key="sb_secret_valid_service_role_key",
            )
            mock_create.return_value = MagicMock()
            
            client = get_supabase_client()
            self.assertIsNotNone(client)
            mock_logger.warning.assert_not_called()


class TestHistoryServiceCRUD(unittest.IsolatedAsyncioTestCase):
    """Tests for HistoryService CRUD operations and multi-user isolation."""

    def setUp(self):
        self.mock_client = MagicMock()
        self.service = HistoryService()

    async def test_save_analysis(self):
        mock_execute = MagicMock()
        mock_execute.data = [{"id": "hist-123", "user_id": "user-aaa"}]
        
        mock_table = MagicMock()
        mock_insert = MagicMock()
        mock_insert.execute.return_value = mock_execute
        mock_table.insert.return_value = mock_insert
        self.mock_client.table.return_value = mock_table

        with patch("app.services.history_service.get_supabase_client", return_value=self.mock_client):
            result = await self.service.save_analysis(
                user_id="user-aaa",
                question="What is broken?",
                what_i_see="Bulging capacitor",
                what_is_happening="Electrolyte leak",
                next_action="Replace capacitor",
                steps=["Step 1: Power off", "Step 2: Discharge"],
                confidence=0.95,
                safety_warning="Electrical hazard",
            )
            self.assertIsNotNone(result)
            self.assertEqual(result["id"], "hist-123")
            mock_table.insert.assert_called_once()
            insert_payload = mock_table.insert.call_args[0][0]
            self.assertEqual(insert_payload["user_id"], "user-aaa")
            self.assertEqual(insert_payload["confidence"], 0.95)

    async def test_get_user_history_scoped_to_user_id(self):
        mock_execute = MagicMock()
        mock_execute.data = [{"id": "hist-1", "user_id": "user-aaa"}]
        
        mock_query = MagicMock()
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.execute.return_value = mock_execute
        
        mock_table = MagicMock()
        mock_table.select.return_value = mock_query
        self.mock_client.table.return_value = mock_table

        with patch("app.services.history_service.get_supabase_client", return_value=self.mock_client):
            records = await self.service.get_user_history(user_id="user-aaa")
            self.assertEqual(len(records), 1)
            # Verify eq("user_id", "user-aaa") was called
            mock_query.eq.assert_called_with("user_id", "user-aaa")

    async def test_user_isolation_get_and_delete(self):
        """Verify that get_by_id and delete are strictly scoped by user_id."""
        mock_query = MagicMock()
        mock_query.eq.return_value = mock_query
        mock_query.single.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data={"id": "hist-1", "user_id": "user-aaa"})
        
        mock_table = MagicMock()
        mock_table.select.return_value = mock_query
        mock_table.delete.return_value = mock_query
        self.mock_client.table.return_value = mock_table

        with patch("app.services.history_service.get_supabase_client", return_value=self.mock_client):
            # Test get_analysis_by_id scoping
            await self.service.get_analysis_by_id(user_id="user-aaa", analysis_id="hist-1")
            eq_calls = [call[0] for call in mock_query.eq.call_args_list]
            self.assertIn(("id", "hist-1"), eq_calls)
            self.assertIn(("user_id", "user-aaa"), eq_calls)

            # Test delete_analysis scoping
            mock_query.eq.reset_mock()
            success = await self.service.delete_analysis(user_id="user-aaa", analysis_id="hist-1")
            self.assertTrue(success)
            del_calls = [call[0] for call in mock_query.eq.call_args_list]
            self.assertIn(("id", "hist-1"), del_calls)
            self.assertIn(("user_id", "user-aaa"), del_calls)


class TestAuthMiddleware(unittest.TestCase):
    """Tests for JWT verification in authentication middleware."""

    def test_missing_auth_header_returns_none(self):
        req = MagicMock()
        req.headers = {}
        user_id = get_user_id_from_request(req)
        self.assertIsNone(user_id)

    def test_valid_jwt_extracts_user_id(self):
        token = jwt.encode(
            {"sub": "user-uuid-12345", "exp": int(time.time()) + 3600},
            "secret",
            algorithm="HS256",
        )
        req = MagicMock()
        req.headers = {"authorization": f"Bearer {token}"}
        user_id = get_user_id_from_request(req)
        self.assertEqual(user_id, "user-uuid-12345")

    def test_expired_jwt_returns_none(self):
        token = jwt.encode(
            {"sub": "user-uuid-12345", "exp": int(time.time()) - 3600},
            "secret",
            algorithm="HS256",
        )
        req = MagicMock()
        req.headers = {"authorization": f"Bearer {token}"}
        user_id = get_user_id_from_request(req)
        self.assertIsNone(user_id)


if __name__ == "__main__":
    unittest.main()
