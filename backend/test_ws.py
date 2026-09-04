# test_ws.py
import asyncio
import websockets
import json

async def listen():
    uri = "ws://127.0.0.1:8000/ws/feed"
    async with websockets.connect(uri) as ws:
        print("Connected! Listening for agent decisions...\n")
        while True:
            msg = await ws.recv()
            data = json.loads(msg)
            print("=" * 50)
            print("Transaction ID:", data.get("transaction_id"))
            print("Status:", data.get("status"))
            if "decision" in data:
                print("Action chosen:", data["decision"].get("action"))
                print("Confidence:", data["decision"].get("confidence"))
                print("Reasoning:", data["decision"].get("reasoning"))
            print("=" * 50, "\n")

asyncio.run(listen())