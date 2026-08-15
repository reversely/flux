"""Entry point: uv run flux-server [--seed] [--host HOST] [--port PORT]."""

import argparse
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="flux stub inference server")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument(
        "--seed",
        action="store_true",
        help="write the sess_sample session before serving",
    )
    parser.add_argument("--data-dir", type=Path, default=None)
    args = parser.parse_args()

    import uvicorn

    from flux_server.main import create_app
    from flux_server.seed import seed_session

    app = create_app(args.data_dir)
    if args.seed:
        from flux_server.main import DEFAULT_DATA_DIR

        session_id = seed_session(args.data_dir or DEFAULT_DATA_DIR)
        print(f"seeded {session_id}")
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
