"""Tests for stock-related API endpoints."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


class TestStockPrice:
    def test_missing_symbol(self, client):
        resp = client.get("/api/stock/price")
        assert resp.status_code == 400

    def test_invalid_symbol(self, client):
        resp = client.get("/api/stock/price?symbol=;DROP+TABLE")
        assert resp.status_code == 400

    def test_empty_symbol(self, client):
        resp = client.get("/api/stock/price?symbol=")
        assert resp.status_code == 400


class TestStockSearch:
    def test_missing_query(self, client):
        resp = client.get("/api/stock/search")
        assert resp.status_code == 200
        assert resp.get_json() == []

    def test_short_query(self, client):
        resp = client.get("/api/stock/search?q=A")
        assert resp.status_code == 200
        assert resp.get_json() == []

    def test_valid_query(self, client):
        resp = client.get("/api/stock/search?q=reliance")
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list)


class TestBatchPrices:
    def test_no_body(self, client):
        resp = client.post("/api/stock/prices", json={})
        assert resp.status_code == 400

    def test_empty_symbols(self, client):
        resp = client.post("/api/stock/prices", json={"symbols": []})
        assert resp.status_code == 400

    def test_too_many_symbols(self, client):
        symbols = [f"SYM{i}" for i in range(60)]
        resp = client.post("/api/stock/prices", json={"symbols": symbols})
        assert resp.status_code == 400


class TestSecurityHeaders:
    def test_headers_present(self, client):
        resp = client.get("/api/stock/search?q=tcs")
        assert resp.headers.get("X-Content-Type-Options") == "nosniff"
        assert resp.headers.get("X-Frame-Options") == "DENY"
        assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


class TestFundamentals:
    def test_missing_symbol(self, client):
        resp = client.get("/api/stock/fundamentals")
        assert resp.status_code == 400

    def test_invalid_symbol(self, client):
        resp = client.get("/api/stock/fundamentals?symbol=;DROP")
        assert resp.status_code == 400

    def test_batch_no_body(self, client):
        resp = client.post("/api/stock/fundamentals", json={})
        assert resp.status_code == 400

    def test_batch_too_many(self, client):
        symbols = [f"SYM{i}" for i in range(25)]
        resp = client.post("/api/stock/fundamentals", json={"symbols": symbols})
        assert resp.status_code == 400
