"""Export the flux-server OpenAPI document to contracts/flux-server.openapi.json."""

import json
from pathlib import Path

from flux_server.main import create_app


def main() -> None:
    out = Path(__file__).resolve().parents[2] / "contracts" / "flux-server.openapi.json"
    out.write_text(json.dumps(create_app().openapi(), indent=2) + "\n")
    print(out)


if __name__ == "__main__":
    main()
