# contracts

Three parties talk over the local network: the phone app (`app/`), the FastAPI
server (`server/`), and the GN100 box (`box/`) running NVIDIA VSS. This
directory holds the interface descriptions they code against.

## flux-server.openapi.json

The OpenAPI document for the flux server, exported from the running route
definitions:

```
cd server && uv run python scripts/export_openapi.py
```

Re-export in the same commit as any route change, so the committed document
matches `server/src/flux_server/main.py`.

## VSS endpoints

The box exposes the stock VSS REST API; docs/prd.md section 2.2 maps each
product interaction to its endpoint (`POST /chat/completions`, `POST /alerts`,
`GET /alerts/recent`, `POST /files`, `/summarize`). Clients call VSS through
those routes as the blueprint documents them; any wrapper the flux server adds
around VSS gets its own routes in the OpenAPI export above.
