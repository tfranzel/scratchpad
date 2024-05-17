import json
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app import app


@pytest.fixture(scope="module", autouse=True)
def admin_bearer():
    with patch("app.SCRATCHPAD_ADMIN_BEARER", "1234"):
        yield


@pytest.fixture
def client():
    yield TestClient(app)


def test_status(client):
    res = client.get("/api/status")
    assert res.status_code == 200


def test_create(client):
    res = client.post("/api/connections", headers={"Authorization": "Bearer 1234"})
    assert res.status_code == 200


def test_create_not_authorized(client):
    res = client.post("/api/connections", headers={"Authorization": "Bearer wrong"})
    assert res.status_code == 403


def test_retrieve(client):
    res = client.post("/api/connections", headers={"Authorization": "Bearer 1234"})
    assert res.status_code == 200

    connection_id = json.loads(res.content)
    res = client.get(f"/api/connections/{connection_id}")
    assert res.status_code == 200
    assert res.content == b'{"a":null,"b":null,"last_text":null,"last_files":null}'
