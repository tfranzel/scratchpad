import logging
import os
import uuid
from collections import defaultdict
from enum import Enum
from os import environ
from typing import Union, Literal, Annotated, Any
from uuid import UUID

from fastapi import FastAPI, HTTPException, Depends
from fastapi.openapi.utils import get_openapi
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, TypeAdapter, ValidationError, ConfigDict, PrivateAttr, Field
from starlette.status import HTTP_403_FORBIDDEN
from starlette.websockets import WebSocket, WebSocketDisconnect

SCRATCHPAD_ADMIN_BEARER = os.environ.get("SCRATCHPAD_ADMIN_BEARER")

BASE_PATH = os.path.dirname(os.path.realpath(__file__))

logger = logging.getLogger(__name__)

app = FastAPI(
    openapi_url="/api/docs/openapi.json",
    docs_url="/api/docs",
)


def custom_openapi() -> dict[str, Any]:
    if app.openapi_schema:
        return app.openapi_schema
    app.openapi_schema = get_openapi(
        title="Scratchpad API",
        version="1.0.0",
        summary="A simple service for encrypted two-party communication.",
        routes=app.routes,
    )
    return app.openapi_schema


app.openapi = custom_openapi  # type: ignore


class JsonWebKey(BaseModel):
    model_config = ConfigDict(frozen=True)

    crv: str
    ext: bool
    key_ops: tuple[str, ...]
    kty: str
    x: str
    y: str


class WSTextMessage(BaseModel):
    type: Literal["text"]
    encrypted: str
    iv: str


class WSFilesMessage(BaseModel):
    type: Literal["files"]
    encrypted: str
    iv: str


class WSKeyExchange(BaseModel):
    type: Literal["key-exchange"]
    key: JsonWebKey


class ConnectionStatusType(Enum):
    DENIED = "denied"
    WAITING = "waiting"
    BOUND = "bound"


class Status(BaseModel):
    type: ConnectionStatusType


WSMessage = Annotated[
    Union[WSKeyExchange, WSTextMessage, WSFilesMessage], Field(discriminator="type")
]


class WebsocketManager:
    """holds all websocket objects and abstracts away some details"""

    def __init__(self) -> None:
        self.connections: dict[UUID, list[WebSocket]] = defaultdict(list)

    async def connect(self, id: UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections[id].append(websocket)

    async def reject(self, websocket: WebSocket) -> None:
        await websocket.accept()
        await self._send(websocket, Status(type=ConnectionStatusType.DENIED))
        await websocket.close()

    async def forward(self, id: UUID, source: WebSocket, payload: BaseModel) -> None:
        for websocket in self.connections[id]:
            if source != websocket:
                await self._send(websocket, payload)

    def remove(self, id: UUID, websocket: WebSocket) -> None:
        self.connections[id].remove(websocket)

    @classmethod
    async def _send(cls, websocket: WebSocket, payload: BaseModel) -> None:
        await websocket.send_text(payload.model_dump_json())


ws_manager = WebsocketManager()


class ClientState(BaseModel):
    _id = PrivateAttr()

    a: JsonWebKey | None = None
    b: JsonWebKey | None = None
    last_text: WSTextMessage | None = None
    last_files: WSFilesMessage | None = None

    def __setattr__(self, key: str, value: Any) -> None:
        super().__setattr__(key, value)
        if key != "_id":
            logger.warning(f"saving {self._id} due to changing {key} ...")
            Database.set(self)


class Database:
    """persistence handler - stores and loads client data as json files"""

    @classmethod
    def get(cls, conn_id: UUID) -> ClientState | None:
        try:
            print(f"{BASE_PATH}/data/{conn_id}.json")
            with open(f"{BASE_PATH}/data/{conn_id}.json") as fh:
                conn = ClientState.model_validate_json(fh.read())
                conn._id = conn_id
                return conn
        except FileNotFoundError:
            return None

    @classmethod
    def set(cls, conn: ClientState) -> None:
        with open(f"{BASE_PATH}/data/{conn._id}.json", "w") as fh:
            fh.write(conn.model_dump_json())

    @classmethod
    def create(cls) -> UUID:
        new_id = uuid.uuid4()
        with open(f"{BASE_PATH}/data/{new_id}.json", "w") as fh:
            fh.write(ClientState().model_dump_json())
        return new_id


@app.websocket("/api/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: UUID) -> None:
    if not Database.get(client_id):
        return await ws_manager.reject(websocket)

    await ws_manager.connect(client_id, websocket)

    try:
        while True:
            try:
                message: WSMessage | None = TypeAdapter(WSMessage).validate_python(
                    await websocket.receive_json()
                )
            except ValidationError:
                message = None

            # get a fresh instance as underlying file might have been updated
            # in the meantime from this or another process.
            client_state = Database.get(client_id)

            if not client_state:
                assert False, "should not happen"
            elif isinstance(message, WSTextMessage):
                # persist and forward received text message
                client_state.last_text = message
                await ws_manager.forward(client_id, websocket, message)
            elif isinstance(message, WSFilesMessage):
                # persist and forward received text message
                client_state.last_files = message
                await ws_manager.forward(client_id, websocket, message)
            elif isinstance(message, WSKeyExchange):
                if message.key == client_state.a or message.key == client_state.b:
                    # we already know the key
                    pass
                elif not client_state.a:
                    # fill slot A
                    client_state.a = message.key
                    await ws_manager.forward(client_id, websocket, message)
                elif not client_state.b:
                    # fill slot B
                    client_state.b = message.key
                    await ws_manager.forward(client_id, websocket, message)
                else:
                    assert False, "should not happen"
            else:
                await websocket.send_json({"type": "invalid"})
    except WebSocketDisconnect:
        ws_manager.remove(client_id, websocket)


@app.get("/api/status")
def status() -> dict[str, str]:
    """Health endpoint"""
    return {
        "status": "online",
        "service": "scratchpad",
        "version": "1.0.0",
    }


@app.get("/api/connections/{id}")
def retrieve_connection_status(id: UUID) -> ClientState:
    """
    Retrieve current status of the connection, public keys of both parties,
    and last exchanged messages.
    """
    if not (conn := Database.get(id)):
        raise HTTPException(status_code=404)
    return conn


@app.post("/api/connections")
def create_connection(auth: Annotated[HTTPAuthorizationCredentials, Depends(HTTPBearer())]) -> UUID:
    """Create a new connection handle"""
    # This admin endpoint is unavailable until ENV var is properly set
    if not SCRATCHPAD_ADMIN_BEARER or auth.credentials != SCRATCHPAD_ADMIN_BEARER:
        raise HTTPException(status_code=HTTP_403_FORBIDDEN)

    return Database.create()


if environ.get("DEV"):
    from starlette.middleware.cors import CORSMiddleware

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost",
            "http://localhost:5173",
            "http://localhost:8000",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
