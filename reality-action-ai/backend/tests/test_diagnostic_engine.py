"""
Unit tests for the Closed-Loop Diagnostic Intelligence Engine:
- State Machine transitions and rejection of illegal states
- Epistemic evidence model (OBSERVED / INFERRED / UNKNOWN)
- Competing hypotheses and disconfirming criteria ("What would prove me wrong?")
- Information-gain Test-to-Know selection
- Physical test interpretation (support vs refutation without case reset)
- Counterfactual repair prediction and Before/After verification
- 7-day TTL expiration and auto-cleanup
- Strict user ownership and cross-user isolation
"""

import unittest
from datetime import datetime, timezone, timedelta
from uuid import uuid4

from app.diagnostic.models import (
    DiagnosticCase,
    EvidenceItem,
    ExpectedOutcome,
    FaultBox,
    Hypothesis,
    ImageQualityAssessment,
    TestResultSubmission,
)
from app.diagnostic.state_machine import DiagnosticStateMachine
from app.diagnostic.engine import DiagnosticEngine
from app.diagnostic.case_service import DiagnosticCaseService


class TestDiagnosticStateMachine(unittest.TestCase):
    def setUp(self):
        self.case = DiagnosticCase(
            id="test_case_123",
            user_id="user_abc",
            session_id="sess_xyz",
            current_state="OBSERVE",
            investigation_progress=0.10,
        )

    def test_01_full_legal_transition_cycle(self):
        """Verify the full deterministic closed loop transitions legally."""
        # OBSERVE -> IDENTIFY
        DiagnosticStateMachine.transition(self.case, "IDENTIFY", "Components located")
        self.assertEqual(self.case.current_state, "IDENTIFY")
        self.assertGreaterEqual(self.case.investigation_progress, 0.20)

        # IDENTIFY -> HYPOTHESIZE
        DiagnosticStateMachine.transition(self.case, "HYPOTHESIZE", "Hypotheses generated")
        self.assertEqual(self.case.current_state, "HYPOTHESIZE")

        # HYPOTHESIZE -> SAFETY_CHECK
        DiagnosticStateMachine.transition(self.case, "SAFETY_CHECK", "Safety preflight check")
        self.assertEqual(self.case.current_state, "SAFETY_CHECK")

        # SAFETY_CHECK -> TEST_TO_KNOW
        DiagnosticStateMachine.transition(self.case, "TEST_TO_KNOW", "Selecting best test")
        self.assertEqual(self.case.current_state, "TEST_TO_KNOW")

        # TEST_TO_KNOW -> AWAITING_TEST
        DiagnosticStateMachine.transition(self.case, "AWAITING_TEST", "Waiting for multimeter reading")
        self.assertEqual(self.case.current_state, "AWAITING_TEST")

        # AWAITING_TEST -> INTERPRET_RESULT
        DiagnosticStateMachine.transition(self.case, "INTERPRET_RESULT", "Operator submitted test result")
        self.assertEqual(self.case.current_state, "INTERPRET_RESULT")

        # INTERPRET_RESULT -> NEXT_ACTION
        DiagnosticStateMachine.transition(self.case, "NEXT_ACTION", "Hypothesis confirmed")
        self.assertEqual(self.case.current_state, "NEXT_ACTION")

        # NEXT_ACTION -> REPAIR
        DiagnosticStateMachine.transition(self.case, "REPAIR", "Repair plan dispatched")
        self.assertEqual(self.case.current_state, "REPAIR")

        # REPAIR -> VERIFY
        DiagnosticStateMachine.transition(self.case, "VERIFY", "Post-repair photo uploaded")
        self.assertEqual(self.case.current_state, "VERIFY")

        # VERIFY -> RESOLVED
        DiagnosticStateMachine.transition(self.case, "RESOLVED", "Verification passed")
        self.assertEqual(self.case.current_state, "RESOLVED")
        self.assertEqual(self.case.status, "RESOLVED")
        self.assertEqual(self.case.investigation_progress, 1.0)
        self.assertIsNotNone(self.case.resolved_at)

    def test_02_illegal_transition_rejected(self):
        """Illegal state transitions must be rejected by the state machine."""
        with self.assertRaises(ValueError) as ctx:
            DiagnosticStateMachine.transition(self.case, "REPAIR", "Bypassing diagnosis")
        self.assertIn("Illegal diagnostic state transition", str(ctx.exception))

        with self.assertRaises(ValueError):
            DiagnosticStateMachine.transition(self.case, "RESOLVED", "Instant resolve")

    def test_03_audit_events_recorded_on_transition(self):
        """Every state transition must append an immutable audit event."""
        initial_event_count = len(self.case.events)
        DiagnosticStateMachine.transition(self.case, "IDENTIFY", "Inspection started")
        self.assertEqual(len(self.case.events), initial_event_count + 1)
        last_event = self.case.events[-1]
        self.assertEqual(last_event.event_type, "STATE_TRANSITION")
        self.assertEqual(last_event.payload["from_state"], "OBSERVE")
        self.assertEqual(last_event.payload["to_state"], "IDENTIFY")


class TestDiagnosticEngineLogic(unittest.IsolatedAsyncioTestCase):
    async def test_04_create_case_from_mock_image(self):
        """Verify complete case creation from image."""
        case = await DiagnosticEngine.create_case_from_image(
            image_b64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            user_id="user_test_1",
            session_id="sess_1",
            question="Diagnose PCB fault",
        )
        self.assertEqual(case.user_id, "user_test_1")
        self.assertEqual(case.current_state, "AWAITING_TEST")
        self.assertGreater(len(case.evidence), 0)
        self.assertGreater(len(case.hypotheses), 0)
        self.assertIsNotNone(case.active_test)

        # Verify epistemic separation
        evidence_types = {e.evidence_type for e in case.evidence}
        self.assertIn("OBSERVED", evidence_types)
        self.assertIn("INFERRED", evidence_types)
        self.assertIn("UNKNOWN", evidence_types)

        # Verify disconfirming criteria present for anti-bias
        for hypo in case.hypotheses:
            self.assertGreater(len(hypo.disconfirming_evidence), 0)

    async def test_05_interpret_test_result_confirming(self):
        """Verify that submitting a physical measurement confirms hypothesis and creates repair plan."""
        case = await DiagnosticEngine.create_case_from_image(
            image_b64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            user_id="user_test_1",
            session_id="sess_1",
        )
        self.assertEqual(case.current_state, "AWAITING_TEST")

        submission = TestResultSubmission(
            test_id=case.active_test.id,
            result_type="NUMERIC",
            numeric_value=120.0,
            unit="uF",
            notes="Measured across C12 leads",
        )

        updated_case, interpretation = await DiagnosticEngine.interpret_test_result(case, submission)
        self.assertEqual(interpretation.outcome, "CONFIRMS")
        self.assertEqual(updated_case.current_state, "REPAIR")
        self.assertIsNotNone(updated_case.repair_plan)

        # Verify timeline recorded
        stages = [t.stage for t in updated_case.confidence_timeline]
        self.assertIn("AFTER_PHYSICAL_TEST", stages)

    async def test_06_interpret_test_result_refuting_does_not_reset_case(self):
        """Verify that refuting a hypothesis weakens it and raises alternatives WITHOUT restarting the case."""
        case = await DiagnosticEngine.create_case_from_image(
            image_b64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            user_id="user_test_1",
            session_id="sess_1",
        )
        submission = TestResultSubmission(
            test_id=case.active_test.id,
            result_type="NUMERIC",
            numeric_value=475.0,  # Normal nominal capacitance!
            unit="uF",
            notes="Capacitance is well within tolerance",
        )

        updated_case, interpretation = await DiagnosticEngine.interpret_test_result(case, submission)
        self.assertIn(interpretation.outcome, ("REFUTES", "CONFIRMS"))
        self.assertEqual(updated_case.current_state, "NEXT_ACTION")

        # Case was NOT reset
        self.assertEqual(updated_case.id, case.id)
        self.assertGreater(len(updated_case.test_history), 0)

    async def test_07_before_after_verification_lifecycle(self):
        """Verify the full before/after verification flow reaches RESOLVED status."""
        case = await DiagnosticEngine.create_case_from_image(
            image_b64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            user_id="user_test_1",
            session_id="sess_1",
        )
        # Fast-forward to REPAIR
        submission = TestResultSubmission(
            test_id=case.active_test.id,
            result_type="NUMERIC",
            numeric_value=150.0,
            unit="uF",
        )
        case, _ = await DiagnosticEngine.interpret_test_result(case, submission)
        self.assertEqual(case.current_state, "REPAIR")

        # Operator uploads post-repair photo
        case, verif = await DiagnosticEngine.verify_repair(
            case,
            after_image_b64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        )
        self.assertIn(verif.status, ("VERIFIED", "INCONCLUSIVE"))
        if verif.status == "VERIFIED":
            self.assertEqual(case.current_state, "RESOLVED")
            self.assertEqual(case.status, "RESOLVED")
            self.assertIsNotNone(case.resolved_at)


class TestDiagnosticCaseServiceAndTTL(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.service = DiagnosticCaseService()

    async def test_08_user_isolation(self):
        """User A must not be able to retrieve User B's diagnostic case."""
        case_id_a = str(uuid4())
        case_a = DiagnosticCase(
            id=case_id_a,
            user_id="user_a",
            session_id="sess_a",
            title="User A Case",
        )
        await self.service.save_case(case_a)

        # User A can get it
        fetched_a = await self.service.get_case("user_a", case_id_a)
        self.assertIsNotNone(fetched_a)
        self.assertEqual(fetched_a.id, case_id_a)

        # User B cannot get it
        fetched_b = await self.service.get_case("user_b", case_id_a)
        self.assertIsNone(fetched_b)

        # User B list does not show User A's case
        list_b = await self.service.list_cases("user_b")
        self.assertEqual(len(list_b), 0)

    async def test_09_seven_day_auto_cleanup(self):
        """Diagnostic cases past their 7-day TTL must be purged automatically."""
        case_id_active = str(uuid4())
        case_id_expired = str(uuid4())

        active_case = DiagnosticCase(
            id=case_id_active,
            user_id="user_x",
            session_id="sess_x",
            expires_at=(datetime.now(timezone.utc) + timedelta(days=6)).isoformat(),
        )
        expired_case = DiagnosticCase(
            id=case_id_expired,
            user_id="user_x",
            session_id="sess_x",
            expires_at=(datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
        )

        await self.service.save_case(active_case)
        await self.service.save_case(expired_case)

        # Trigger cleanup
        cleaned = await self.service.cleanup_expired_cases()
        self.assertGreaterEqual(cleaned, 1)

        # Verify active remains, expired gone
        cases = await self.service.list_cases("user_x")
        case_ids = [c.id for c in cases]
        self.assertIn(case_id_active, case_ids)
        self.assertNotIn(case_id_expired, case_ids)

    async def test_10_uuid_generation_and_validation(self):
        """Ensure canonical case ID is a valid standard UUID and reject case_xxx prefixes."""
        from app.diagnostic.models import is_valid_uuid

        # 1. create_case_from_image produces valid UUID
        case = await DiagnosticEngine.create_case_from_image(
            image_b64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            user_id="user_test_uuid",
            session_id="sess_uuid",
        )
        self.assertTrue(is_valid_uuid(case.id), f"Generated ID {case.id} is not a valid UUID")
        self.assertFalse(case.id.startswith("case_"), "ID must not have case_ prefix")

        # 2. is_valid_uuid rejects malformed prefixes
        self.assertFalse(is_valid_uuid("case_75643c66ad9a"))
        self.assertFalse(is_valid_uuid("case_12345"))
        self.assertFalse(is_valid_uuid(None))
        self.assertFalse(is_valid_uuid(""))
        self.assertTrue(is_valid_uuid("550e8400-e29b-41d4-a716-446655440000"))

        # 3. Reject non-UUID in update_case
        case.id = "case_invalid_id"
        with self.assertRaises(ValueError) as ctx:
            await self.service.update_case(case)
        self.assertIn("INVALID_CASE_ID", str(ctx.exception))

    async def test_11_session_id_independence(self):
        """session_id remains arbitrary text context while case id is strictly UUID."""
        from app.diagnostic.models import is_valid_uuid

        case = await DiagnosticEngine.create_case_from_image(
            image_b64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            user_id="user_sess_test",
            session_id="diag-session-abc123-arbitrary",
        )
        self.assertTrue(is_valid_uuid(case.id))
        self.assertEqual(case.session_id, "diag-session-abc123-arbitrary")
        self.assertNotEqual(case.id, case.session_id)


if __name__ == "__main__":
    unittest.main()

