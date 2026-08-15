"""Identify service on the GN100: one endpoint over the verified perception stack.

SpeciesNet (MegaDetector plus classifier ensemble, geofenced), BioCLIP zero-shot
over taxonomic label strings, and FungiTastic-Mini run behind POST /identify.
Models load once at startup. The BioCLIP label list comes from the file named by
BIOCLIP_LABELS (one "a photo of ..."-ready label per line); the GBIF checklist
build replaces that file, and the service restarts to pick it up. FungiTastic
returns class indices until its metadata supplies the index-to-species map.
"""

import os
import tempfile
from pathlib import Path

import torch
from fastapi import FastAPI, Form, UploadFile

# A starter list for the demo loop; the Washington GBIF checklist replaces it.
STARTER_LABELS = [
    "Animalia Chordata Mammalia Artiodactyla Cervidae Odocoileus hemionus (mule deer)",
    "Animalia Chordata Mammalia Artiodactyla Cervidae Cervus canadensis (elk)",
    "Animalia Chordata Mammalia Carnivora Ursidae Ursus americanus (American black bear)",
    "Animalia Chordata Mammalia Carnivora Canidae Canis latrans (coyote)",
    "Animalia Chordata Mammalia Carnivora Felidae Puma concolor (cougar)",
    "Animalia Chordata Mammalia Carnivora Procyonidae Procyon lotor (raccoon)",
    "Animalia Chordata Mammalia Rodentia Sciuridae Tamiasciurus douglasii (Douglas squirrel)",
    "Animalia Chordata Aves Galliformes Phasianidae Meleagris gallopavo (wild turkey)",
    "Fungi Basidiomycota Agaricomycetes Agaricales Amanitaceae Amanita muscaria (fly agaric)",
    "Fungi Basidiomycota Agaricomycetes Agaricales Amanitaceae Amanita phalloides (death cap)",
    "Fungi Basidiomycota Agaricomycetes Cantharellales Cantharellaceae Cantharellus formosus (Pacific golden chanterelle)",
    "Plantae Tracheophyta Magnoliopsida Apiales Apiaceae Conium maculatum (poison hemlock)",
    "Plantae Tracheophyta Magnoliopsida Apiales Apiaceae Cicuta douglasii (western water hemlock)",
    "Plantae Tracheophyta Magnoliopsida Rosales Urticaceae Urtica dioica (stinging nettle)",
    "Plantae Tracheophyta Magnoliopsida Ericales Ericaceae Vaccinium ovatum (evergreen huckleberry)",
]

FUNGITASTIC_CHECKPOINT = "hf-hub:BVRA/tf_efficientnet_b3.in1k_ft_fungitastic-m_384"


def load_labels() -> list[str]:
    path = os.environ.get("BIOCLIP_LABELS")
    if path and Path(path).exists():
        return [ln.strip() for ln in Path(path).read_text().splitlines() if ln.strip()]
    return STARTER_LABELS


def create_app() -> FastAPI:
    import open_clip
    import timm
    from PIL import Image
    from speciesnet import DEFAULT_MODEL, SpeciesNet

    device = "cuda" if torch.cuda.is_available() else "cpu"
    app = FastAPI(title="flux perception service")

    snet = SpeciesNet(DEFAULT_MODEL)

    bioclip, _, bioclip_pre = open_clip.create_model_and_transforms(
        "hf-hub:imageomics/bioclip"
    )
    bioclip = bioclip.to(device).eval()
    tokenizer = open_clip.get_tokenizer("hf-hub:imageomics/bioclip")
    labels = load_labels()
    with torch.no_grad():
        label_emb = bioclip.encode_text(
            tokenizer(["a photo of " + label for label in labels]).to(device)
        )
        label_emb /= label_emb.norm(dim=-1, keepdim=True)

    fungi = timm.create_model(FUNGITASTIC_CHECKPOINT, pretrained=True).to(device).eval()
    fungi_tf = timm.data.create_transform(
        **timm.data.resolve_data_config({}, model=fungi)
    )

    @app.get("/healthz")
    def healthz() -> dict:
        return {"ok": True, "device": device, "bioclip_labels": len(labels)}

    def run_speciesnet(path: str, country: str, admin1_region: str) -> dict:
        instances = {
            "instances": [
                {"filepath": path, "country": country, "admin1_region": admin1_region}
            ]
        }
        pred = snet.predict(instances_dict=instances)["predictions"][0]
        return {
            "prediction": pred.get("prediction"),
            "score": pred.get("prediction_score"),
            "detections": pred.get("detections", [])[:5],
        }

    def run_bioclip(image: "Image.Image", top_k: int) -> list[dict]:
        with torch.no_grad():
            emb = bioclip.encode_image(bioclip_pre(image).unsqueeze(0).to(device))
            emb /= emb.norm(dim=-1, keepdim=True)
            probs = (100 * emb @ label_emb.T).softmax(-1).squeeze(0)
        top = probs.topk(min(top_k, len(labels)))
        return [
            {"label": labels[i], "score": round(p, 4)}
            for i, p in zip(top.indices.tolist(), top.values.tolist())
        ]

    def run_fungitastic(image: "Image.Image", top_k: int) -> list[dict]:
        with torch.no_grad():
            probs = (
                fungi(fungi_tf(image.convert("RGB")).unsqueeze(0).to(device))
                .softmax(-1)
                .squeeze(0)
            )
        top = probs.topk(top_k)
        return [
            {"class_index": i, "score": round(p, 4)}
            for i, p in zip(top.indices.tolist(), top.values.tolist())
        ]

    @app.post("/identify")
    async def identify(
        file: UploadFile,
        domain: str = Form("auto"),
        country: str = Form("USA"),
        admin1_region: str = Form("WA"),
        top_k: int = Form(5),
    ) -> dict:
        data = await file.read()
        suffix = Path(file.filename or "frame.jpg").suffix or ".jpg"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(data)
            tmp_path = tmp.name
        try:
            image = Image.open(tmp_path)
            result: dict = {"domain": domain}
            if domain in ("auto", "wildlife"):
                result["speciesnet"] = run_speciesnet(tmp_path, country, admin1_region)
            if domain in ("auto", "wildlife", "plant", "fungus"):
                result["bioclip"] = run_bioclip(image, top_k)
            if domain in ("auto", "fungus"):
                result["fungitastic"] = run_fungitastic(image, top_k)
            return result
        finally:
            os.unlink(tmp_path)

    return app


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(create_app(), host="0.0.0.0", port=int(os.environ.get("PORT", "8100")))
