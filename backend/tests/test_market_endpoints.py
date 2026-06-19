"""Tests for MF-related API endpoints."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


class TestMfNav:
    def test_missing_scheme_code(self, client):
        resp = client.get("/api/mf/nav")
        assert resp.status_code == 400

    def test_invalid_scheme_code(self, client):
        resp = client.get("/api/mf/nav?scheme_code=abc")
        assert resp.status_code == 400


class TestMfSearch:
    def test_missing_query(self, client):
        resp = client.get("/api/mf/search")
        assert resp.status_code == 200
        assert resp.get_json() == []

    def test_short_query(self, client):
        resp = client.get("/api/mf/search?q=A")
        assert resp.status_code == 200
        assert resp.get_json() == []

    def test_valid_query(self, client):
        resp = client.get("/api/mf/search?q=axis")
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list)


class TestMarketOverview:
    def test_returns_200(self, client):
        resp = client.get("/api/market/overview")
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, dict)


class TestFxUsdInr:
    def test_returns_200(self, client):
        resp = client.get("/api/fx/usd-inr")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "rate" in data


class TestUpcomingEvents:
    def test_empty_holdings_ok(self, client):
        resp = client.post(
            "/api/portfolio/upcoming-events",
            json={"holdings": [], "days": 30},
        )
        assert resp.status_code == 200

    def test_days_too_large(self, client):
        resp = client.post(
            "/api/portfolio/upcoming-events",
            json={"holdings": [{"symbol": "TCS"}], "days": 999},
        )
        assert resp.status_code == 400
