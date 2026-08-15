"""Entry point: uv run flux-server [--host HOST] [--port PORT]."""

import argparse
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="flux stub inference server")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--data-dir", type=Path, default=None)
    args = parser.parse_args()

    import uvicorn

    from flux_server.main import create_app

    uvicorn.run(create_app(args.data_dir), host=args.host, port=args.port)


if __name__ == "__main__":
    main()
