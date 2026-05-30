import json

from fastapi import FastAPI
from pydantic import BaseModel, Field, IPvAnyAddress
from transformers import pipeline
from typing import Literal
from uuid import UUID



app = FastAPI(title="Detect Demo API", version="1.0.0")


# Initialize the pipeline
classifier = pipeline("text-classification", model="sayantan8768768/smartwaf-distilbert-waf_v1")


@app.get("/health")
async def health():
    return {"status": "ok"}

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
    
    # Run inference (with return_token_type_ids=False to avoid DistilBERT error)
    result = classifier(result_string, return_token_type_ids=False)

    attack_vector = result[0]["label"]
    confidence_score = round(result[0]["score"] * 100, 4)

    # ✅ FIXED: Use req.request_id directly (it's already a UUID)
    return {
        "request_id": str(req.request_id),  # Convert UUID to string for JSON response
        "attack_vector": attack_vector,
        "confidence_score": confidence_score
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5001)