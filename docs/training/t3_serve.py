"""Serve the T3 tourniquet adapter as an OpenAI-compatible endpoint.

Box-side, port 30083. Loads the base cosmos-reason2-8b snapshot plus the
LoRA adapter (projector included via modules_to_save) and answers
/v1/chat/completions in the subset the server's CosmosStepClassifier
uses: one user message of text plus data-URI images, temperature 0. The
cosmos NIM in this deployment carries no PEFT hooks, so the adapter gets
its own process; the server routes only the tourniquet procedure here via
FLUX_COSMOS_MODEL_TOURNIQUET and FLUX_COSMOS_T3_URL.

Usage:
    ./venv/bin/python t3_serve.py --adapter ~/flux-model/train/runs/r1/final --port 30083
"""

import argparse
import base64
import io
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import torch
from peft import PeftModel
from PIL import Image
from transformers import AutoProcessor, Qwen3VLForConditionalGeneration

MODEL_DIR = Path.home() / "flux-model/train/cosmos-reason2-8b"
MAX_PIXELS = 480 * 640
SERVED_NAME = "cosmos-reason2-8b-t3"

processor = None
model = None


def load(adapter: Path) -> None:
    global processor, model
    processor = AutoProcessor.from_pretrained(MODEL_DIR)
    base = Qwen3VLForConditionalGeneration.from_pretrained(
        MODEL_DIR, torch_dtype=torch.bfloat16, device_map="cuda"
    )
    model = PeftModel.from_pretrained(base, adapter, torch_dtype=torch.bfloat16)
    model.eval()


def answer(request: dict) -> str:
    content = request["messages"][0]["content"]
    text = next(c["text"] for c in content if c["type"] == "text")
    images = []
    for c in content:
        if c["type"] == "image_url":
            b64 = c["image_url"]["url"].split(",", 1)[1]
            images.append(Image.open(io.BytesIO(base64.b64decode(b64))))
    chat = [
        {
            "role": "user",
            "content": [{"type": "text", "text": text}]
            + [{"type": "image"} for _ in images],
        }
    ]
    prompt = processor.apply_chat_template(
        chat, tokenize=False, add_generation_prompt=True
    )
    enc = processor(
        text=prompt, images=images or None, max_pixels=MAX_PIXELS, return_tensors="pt"
    ).to("cuda")
    with torch.inference_mode():
        out = model.generate(
            **enc,
            max_new_tokens=int(request.get("max_tokens", 200)),
            do_sample=False,
        )
    return processor.decode(
        out[0][enc["input_ids"].shape[1] :], skip_special_tokens=True
    )


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/v1/chat/completions":
            self.send_error(404)
            return
        body = self.rfile.read(int(self.headers["Content-Length"]))
        try:
            request = json.loads(body)
            text = answer(request)
            payload = {
                "model": SERVED_NAME,
                "choices": [{"message": {"role": "assistant", "content": text}}],
            }
            data = json.dumps(payload).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception as error:  # noqa: BLE001 - the client retries on 500
            self.send_error(500, str(error)[:200])

    def log_message(self, fmt, *args):
        pass


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--adapter", required=True)
    parser.add_argument("--port", type=int, default=30083)
    args = parser.parse_args()
    load(Path(args.adapter).expanduser())
    server = ThreadingHTTPServer(("0.0.0.0", args.port), Handler)
    print(f"serving {SERVED_NAME} on :{args.port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
