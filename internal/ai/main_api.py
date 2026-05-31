import asyncio
import json
import logging
import os
import re
import threading
import time
from contextlib import suppress
from dataclasses import dataclass
from typing import Literal
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from uuid import UUID

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field, IPvAnyAddress
from transformers import pipeline


LOGGER = logging.getLogger(__name__)

app = FastAPI(title="Detect Demo API", version="1.0.0")

MODEL_NAMESPACE = os.getenv("HF_MODEL_NAMESPACE", "sayantan8768768")
MODEL_PREFIX = os.getenv("HF_MODEL_PREFIX", "smartwaf-distilbert-waf")
MODEL_MONITOR_INTERVAL_SECONDS = int(os.getenv("MODEL_MONITOR_INTERVAL_SECONDS", "300"))
INITIAL_MODEL_NAME = os.getenv(
    "MODEL_NAME",
    f"{MODEL_NAMESPACE}/{MODEL_PREFIX}_v1",
)
HUGGINGFACE_MODELS_API = "https://huggingface.co/api/models"


@dataclass(frozen=True)
class ModelCandidate:
    model_id: str
    version: int


class ModelManager:
    def __init__(self, initial_model_name: str):
        self._lock = threading.RLock()
        self._classifier = pipeline("text-classification", model=initial_model_name)
        self._model_name = initial_model_name
        self._last_checked_at: float | None = None
        self._last_swapped_at: float | None = None
        self._last_error: str | None = None

    def snapshot(self) -> tuple[object, str]:
        with self._lock:
            return self._classifier, self._model_name

    def status(self) -> dict[str, object]:
        with self._lock:
            return {
                "model_name": self._model_name,
                "last_checked_at": self._last_checked_at,
                "last_swapped_at": self._last_swapped_at,
                "last_error": self._last_error,
            }

    def _fetch_latest_model(self) -> ModelCandidate | None:
        params = {
            "author": MODEL_NAMESPACE,
            "search": MODEL_PREFIX,
            "full": "true",
            "sort": "lastModified",
            "direction": "-1",
        }
        request = Request(
            f"{HUGGINGFACE_MODELS_API}?{urlencode(params)}",
            headers={"User-Agent": "waf-proxy-ai/1.0"},
        )

        with urlopen(request, timeout=20) as response:
            payload = json.load(response)

        candidates: list[ModelCandidate] = []
        pattern = re.compile(
            rf"^{re.escape(MODEL_NAMESPACE)}/{re.escape(MODEL_PREFIX)}_v(\d+)$"
        )
        for item in payload:
            model_id = item.get("id") or item.get("modelId")
            if not isinstance(model_id, str):
                continue
            match = pattern.match(model_id)
            if not match:
                continue
            candidates.append(ModelCandidate(model_id=model_id, version=int(match.group(1))))

        if not candidates:
            return None

        return max(candidates, key=lambda candidate: candidate.version)

    def _load_classifier(self, model_name: str):
        return pipeline("text-classification", model=model_name)

    def _swap_model(self, new_model_name: str):
        LOGGER.info("Loading candidate model %s", new_model_name)
        new_classifier = self._load_classifier(new_model_name)

        with self._lock:
            old_model_name = self._model_name
            self._classifier = new_classifier
            self._model_name = new_model_name
            self._last_swapped_at = time.time()
            self._last_error = None

        LOGGER.info("Swapped model from %s to %s", old_model_name, new_model_name)

    async def check_for_swap(self, force_reload: bool = False) -> dict[str, object]:
        with self._lock:
            self._last_checked_at = time.time()

        try:
            latest = await asyncio.to_thread(self._fetch_latest_model)
            if latest is None:
                raise HTTPException(status_code=404, detail="No matching model versions found")

            _, current_model_name = self.snapshot()
            if latest.model_id == current_model_name and not force_reload:
                return {
                    "swapped": False,
                    "reason": "already on latest model",
                    "current_model_name": current_model_name,
                    "latest_model_name": latest.model_id,
                }

            await asyncio.to_thread(self._swap_model, latest.model_id)
            return {
                "swapped": True,
                "reason": "model updated successfully",
                "current_model_name": latest.model_id,
                "latest_model_name": latest.model_id,
            }
        except HTTPException:
            raise
        except Exception as exc:
            error_message = str(exc)
            with self._lock:
                self._last_error = error_message
            LOGGER.exception("Model swap check failed")
            raise HTTPException(status_code=502, detail=f"model swap check failed: {error_message}") from exc

    async def monitor_latest_models(self):
        while True:
            try:
                await self.check_for_swap()
            except HTTPException:
                pass
            except asyncio.CancelledError:
                raise
            except Exception:
                LOGGER.exception("Unexpected model monitor failure")
            await asyncio.sleep(MODEL_MONITOR_INTERVAL_SECONDS)


model_manager = ModelManager(INITIAL_MODEL_NAME)
monitor_task: asyncio.Task[None] | None = None


@app.get("/health")
async def health():
    return {"status": "ok", **model_manager.status()}

def json_to_waf_string(json_input):
    """
    Converts a WAF JSON payload into the exact string format 
    without removing any empty parameters.
    """
    # 1. Parse JSON if it's a string
    if isinstance(json_input, str):
        data = json.loads(json_input)
    else:
        data = json_input

    # 2. Define the mapping and EXACT order from your training script
    fields = [
        ("method", "method"),
        ("protocol", "protocol"),
        ("path", "path"),
        ("query_string", "query"),
        ("body_raw", "body"),
        ("content_type", "content_type"),
        ("user_agent", "user_agent"),
        ("cookie", "cookie"),
        ("path_depth", "path_depth"),
        ("source_ip", "source_ip"),
        ("timestamp", "timestamp"),
        ("request_id", "request_id"),
        ("has_encoded_chars", "has_encoded_chars"),
        ("has_script_tag", "has_script_tag")
    ]

    parts = []
    for json_key, prefix in fields:
        val = data.get(json_key, "")
        
        if isinstance(val, bool):
            val = str(val).lower()
        elif val is None:
            val = ""
            
        parts.append(f"{prefix}: {val}")

    return " | ".join(parts)


    






class WAFRequestRecord(BaseModel):
    request_id: UUID = Field(description="Unique request identifier")
    timestamp: int = Field(description="Unix timestamp in milliseconds")
    source_ip: IPvAnyAddress = Field(description="Source IPv4 address")
    protocol: Literal["HTTP/1.1"] = Field(description="HTTP protocol version")
    method: str = Field(description="HTTP request method")
    path: str = Field(description="Target endpoint path beginning with '/'")
    query_string: str = Field(description="URL query string or empty string")
    user_agent: str = Field(description="HTTP User-Agent header")
    cookie: str = Field(description="Cookie header value or empty string")
    body_raw: str = Field(description="Raw HTTP request body or empty string")
    content_type: str = Field(description="Request content type or empty string")
    has_encoded_chars: bool = Field(description="Indicates presence of encoded or obfuscated characters")
    has_script_tag: bool = Field(description="Indicates presence of literal script tags")
    path_depth: int = Field(ge=0, description="Number of path segments")



class Response(BaseModel):
    request_id: str
    attack_vector: str
    confidence_score: float
   


@app.post("/detect", response_model=Response)
async def detect(req: WAFRequestRecord):
    # Convert request to formatted string for the model
    result_string = json_to_waf_string(req.dict())

    classifier, _ = model_manager.snapshot()

    # Run inference with a snapshot of the live classifier so swaps do not block requests.
    result = await asyncio.to_thread(
        classifier,
        result_string,
        return_token_type_ids=False,
    )

    attack_vector = result[0]["label"]
    confidence_score = round(result[0]["score"] * 100, 4)

    # ✅ FIXED: Use req.request_id directly (it's already a UUID)
    return {
        "request_id": str(req.request_id),  # Convert UUID to string for JSON response
        "attack_vector": attack_vector,
        "confidence_score": confidence_score
    }


@app.post("/swap")
async def swap_model(force_reload: bool = Query(False, description="Reload the latest model even if it is already active")):
    return await model_manager.check_for_swap(force_reload=force_reload)


@app.on_event("startup")
async def start_model_monitor():
    global monitor_task

    if monitor_task is None or monitor_task.done():
        monitor_task = asyncio.create_task(model_manager.monitor_latest_models())


@app.on_event("shutdown")
async def stop_model_monitor():
    global monitor_task

    if monitor_task is not None:
        monitor_task.cancel()
        with suppress(asyncio.CancelledError):
            await monitor_task
        monitor_task = None


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5001)