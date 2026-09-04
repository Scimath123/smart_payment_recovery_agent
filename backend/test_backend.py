# test_ws.py
import asyncio
import websockets

async def listen():
    uri = "ws://127.0.0.1:8000/ws/feed"
    async with websockets.connect(uri) as ws:
        print("Connected! Waiting for messages...")
        while True:
            msg = await ws.recv()
            print("Received:", msg)

asyncio.run(listen())