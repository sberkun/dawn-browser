import pathlib
import ssl
import asyncio
import websockets

DAWN_PORT = 8107

# 1-byte dawn-level opcodes
HANDSHAKE = 15
PROTOBUF = 16
FILE = 17




async def echo(websocket):
    print("gucci")
    await websocket.send(b'cheese')
    async for message in websocket:
        print(message)
        await websocket.send(message)

async def main():
    print("starting main")
    async with websockets.serve(echo, "0.0.0.0", DAWN_PORT):
        await asyncio.Future()  # run forever

asyncio.run(main())
