"""LoRA fine-tune of cosmos-reason2-8b on the T3 tourniquet sets.

Box-side, single GB10. The shape from docs/plans/t3-fine-tune.md: vision
tower frozen, the multimodal projector (merger) trained in full, rank-16
alpha-32 LoRA on every decoder linear projection. Data comes from
t3_prep.py's chat-format JSONL; only assistant tokens are supervised.

Usage:
    python3 t3_train.py --data ~/flux-model/train/data --out ~/flux-model/train/runs/smoke \
        --max-steps 30            # smoke: fit + throughput + memory
    python3 t3_train.py --data ~/flux-model/train/data --out ~/flux-model/train/runs/r1 \
        --epochs 2
"""

import argparse
import json
import math
import random
import time
from pathlib import Path

import torch
from peft import LoraConfig, get_peft_model
from PIL import Image
from transformers import AutoProcessor, Qwen3VLForConditionalGeneration

MODEL_DIR = Path.home() / "flux-model/train/cosmos-reason2-8b"
# Bounds the visual token count per frame; 720p frames land around 480p
# equivalent after this, which keeps 8-frame segments inside the GB10
# while the NIMs stay resident.
MAX_PIXELS = 480 * 640
LORA_RANK = 16
LORA_ALPHA = 32
LR = 1e-4
GRAD_ACCUM = 8
WARMUP_STEPS = 20
LOG_EVERY = 10
SAVE_EVERY = 200
SEED = 20260816


def load_examples(path: Path) -> list[dict]:
    with open(path) as handle:
        return [json.loads(line) for line in handle]


def build_batch(example: dict, processor) -> dict:
    user, assistant = example["messages"]
    images = [Image.open(c["path"]) for c in user["content"] if c["type"] == "image"]
    text = next(c["text"] for c in user["content"] if c["type"] == "text")
    chat = [
        {
            "role": "user",
            "content": [{"type": "text", "text": text}]
            + [{"type": "image"} for _ in images],
        },
        {
            "role": "assistant",
            "content": [{"type": "text", "text": assistant["content"]}],
        },
    ]
    full = processor.apply_chat_template(chat, tokenize=False)
    prompt_only = processor.apply_chat_template(
        chat[:1], tokenize=False, add_generation_prompt=True
    )
    enc = processor(
        text=full, images=images, max_pixels=MAX_PIXELS, return_tensors="pt"
    )
    prompt_enc = processor(
        text=prompt_only, images=images, max_pixels=MAX_PIXELS, return_tensors="pt"
    )
    labels = enc["input_ids"].clone()
    labels[:, : prompt_enc["input_ids"].shape[1]] = -100
    enc["labels"] = labels
    return enc


def trainable_setup(model) -> None:
    model.requires_grad_(False)
    lora = LoraConfig(
        r=LORA_RANK,
        lora_alpha=LORA_ALPHA,
        lora_dropout=0.05,
        bias="none",
        # Decoder linears only; the vision tower's layers use distinct
        # module names (blocks.*.attn.qkv) that this list never matches.
        target_modules=[
            "q_proj",
            "k_proj",
            "v_proj",
            "o_proj",
            "gate_proj",
            "up_proj",
            "down_proj",
        ],
        # The projector trains in full and rides along in the adapter save.
        modules_to_save=["merger"],
    )
    return get_peft_model(model, lora)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--max-steps", type=int, default=0)
    parser.add_argument("--epochs", type=int, default=1)
    args = parser.parse_args()
    data_dir = Path(args.data).expanduser()
    out = Path(args.out).expanduser()
    out.mkdir(parents=True, exist_ok=True)

    random.seed(SEED)
    torch.manual_seed(SEED)
    processor = AutoProcessor.from_pretrained(MODEL_DIR)
    model = Qwen3VLForConditionalGeneration.from_pretrained(
        MODEL_DIR, torch_dtype=torch.bfloat16, device_map="cuda"
    )
    model.gradient_checkpointing_enable()
    model = trainable_setup(model)
    model.print_trainable_parameters()

    examples = load_examples(data_dir / "train.jsonl")
    random.shuffle(examples)
    optimizer_steps_per_epoch = math.ceil(len(examples) / GRAD_ACCUM)
    total_steps = args.max_steps or optimizer_steps_per_epoch * args.epochs
    optimizer = torch.optim.AdamW(
        [p for p in model.parameters() if p.requires_grad], lr=LR
    )
    scheduler = torch.optim.lr_scheduler.LambdaLR(
        optimizer,
        lambda s: (
            min(1.0, (s + 1) / WARMUP_STEPS)
            * 0.5
            * (1 + math.cos(math.pi * min(s, total_steps) / total_steps))
        ),
    )

    model.train()
    step = 0
    micro = 0
    running = 0.0
    started = time.time()
    log = (out / "train.log").open("a")
    while step < total_steps:
        for example in examples:
            if step >= total_steps:
                break
            try:
                batch = build_batch(example, processor)
            except Exception as error:  # noqa: BLE001 - one bad image never kills a run
                print("skip:", error, file=log, flush=True)
                continue
            batch = {k: v.to("cuda") for k, v in batch.items()}
            loss = model(**batch).loss / GRAD_ACCUM
            loss.backward()
            running += loss.item()
            micro += 1
            if micro % GRAD_ACCUM == 0:
                torch.nn.utils.clip_grad_norm_(
                    [p for p in model.parameters() if p.requires_grad], 1.0
                )
                optimizer.step()
                scheduler.step()
                optimizer.zero_grad(set_to_none=True)
                step += 1
                if step % LOG_EVERY == 0 or step == 1:
                    mem = torch.cuda.max_memory_allocated() / 2**30
                    rate = step / (time.time() - started)
                    msg = (
                        f"step {step}/{total_steps} loss {running / LOG_EVERY:.4f} "
                        f"lr {scheduler.get_last_lr()[0]:.2e} mem {mem:.1f}GiB "
                        f"{rate * 3600:.0f} steps/h"
                    )
                    print(msg)
                    print(msg, file=log, flush=True)
                    running = 0.0
                if step % SAVE_EVERY == 0:
                    model.save_pretrained(out / f"step{step}")
    model.save_pretrained(out / "final")
    print("saved", out / "final")


if __name__ == "__main__":
    main()
