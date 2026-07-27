import httpx
try:
    res = httpx.post("http://localhost:8000/telemetry/evolve")
    print(res.json())
except Exception as e:
    print("Evolution failed:", e)
