from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_provider_diagnostic_never_exposes_key_fragment_or_claims_connectivity(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "sensitive-provider-key")
    response = client.get("/api/inspection/diagnostic")
    assert response.status_code == 200
    data = response.json()
    assert data["gemini_key_configured"] is True
    assert data["connectivity_checked"] is False
    assert "key_prefix" not in data
    assert "sensitive-provider-key" not in response.text


def test_provider_diagnostic_reports_missing_configuration(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    response = client.get("/api/inspection/diagnostic")
    assert response.status_code == 200
    assert response.json()["gemini_key_configured"] is False
    assert response.json()["connectivity_checked"] is False
