import os
import sys
import traceback
from pathlib import Path

# Add backend directory to path
backend_dir = Path(r"c:\Users\Divakar K R\Action-AI\reality-action-ai\backend")
sys.path.insert(0, str(backend_dir))

from app.config.settings import get_settings
from app.services.rag_service import get_rag_service
from app.services.gemma_service import GemmaService, _format_rag_context, _ensure_data_url
import huggingface_hub
from huggingface_hub import InferenceClient

settings = get_settings()

print("=== 1. ENVIRONMENT & CONFIGURATION CHECK ===")
print("AI_MODE:", settings.ai_mode)
print("HF_MODEL:", settings.hf_model)
print("HF_TOKEN loaded?:", bool(settings.hf_token and settings.hf_token.strip()))
print("HF_TOKEN length:", len(settings.hf_token) if settings.hf_token else 0)
print("HF_TOKEN prefix:", settings.hf_token[:3] if settings.hf_token else "none")

print("\n=== 2. TOKEN PERMISSION & WHOAMI CHECK ===")
try:
    whoami = huggingface_hub.whoami(token=settings.hf_token)
    print("whoami name:", whoami.get("name"))
    print("whoami type:", whoami.get("type"))
    print("whoami auth:", whoami.get("auth", {}).get("type"))
    print("whoami permissions:", whoami.get("auth", {}).get("accessToken", {}).get("role"))
except Exception as e:
    print("whoami failed:", type(e).__name__, str(e))

print("\n=== 3. RAG RETRIEVAL STAGE CHECK ===")
try:
    rag = get_rag_service()
    chunks = rag.load_documents()
    rag.build_index()
    print("RAG loaded chunks:", len(chunks))
    import asyncio
    retrieved = asyncio.run(rag.retrieve("electrical test", top_k=2))
    print("RAG retrieval executed successfully before inference?: YES")
    print("Retrieved sources:", [c.source for c in retrieved])
except Exception as e:
    print("RAG retrieval failed:", e)

print("\n=== 4. DIRECT INFERENCECLIENT CALL TRACE ===")
client = InferenceClient(
    api_key=settings.hf_token,
    provider="auto",
    timeout=30.0,
)

test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
data_url = _ensure_data_url(test_image_b64)

messages = [
    {
        "role": "user",
        "content": [
            {"type": "image_url", "image_url": {"url": data_url}},
            {"type": "text", "text": "What do you see?"},
        ],
    }
]

try:
    print("Calling client.chat_completion...")
    resp = client.chat_completion(
        messages=messages,
        model=settings.hf_model,
        max_tokens=100,
    )
    print("Inference response received:", resp)
except Exception as e:
    print("INFERENCE EXCEPTION CAUGHT:")
    print("Exception Class:", type(e).__name__)
    print("Exception Message:", str(e))
    if hasattr(e, "response") and e.response is not None:
        print("HTTP Status Code:", getattr(e.response, "status_code", None))
        try:
            print("HTTP Response Text:", e.response.text)
        except Exception:
            pass
        try:
            print("HTTP Response Headers:", dict(e.response.headers))
        except Exception:
            pass
    print("\nFull Traceback:")
    traceback.print_exc()

print("\n=== 5. MODEL METADATA CHECK ===")
try:
    model_info = huggingface_hub.model_info(settings.hf_model, token=settings.hf_token)
    print("Model ID:", model_info.id)
    print("Pipeline Tag:", getattr(model_info, "pipeline_tag", None))
    print("Tags:", getattr(model_info, "tags", None))
    print("Inference Providers / Status:", getattr(model_info, "inference", None))
except Exception as e:
    print("Model info lookup failed:", type(e).__name__, str(e))
