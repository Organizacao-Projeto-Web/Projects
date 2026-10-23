from unittest.mock import Mock

from app.core.whatsapp import enviar_codigo_recuperacao


def test_enviar_codigo_recuperacao(monkeypatch):
    monkeypatch.setenv(
        "WHATSAPP_ACCESS_TOKEN",
        "token-teste",
    )
    monkeypatch.setenv(
        "WHATSAPP_PHONE_NUMBER_ID",
        "123456789",
    )
    monkeypatch.setenv(
        "WHATSAPP_API_VERSION",
        "v25.0",
    )
    monkeypatch.setenv(
        "WHATSAPP_TEMPLATE_NAME",
        "codigo_recuperacao",
    )
    monkeypatch.setenv(
        "WHATSAPP_TEMPLATE_LANGUAGE",
        "pt_BR",
    )

    resposta_mock = Mock()
    resposta_mock.raise_for_status.return_value = None
    resposta_mock.json.return_value = {
        "messages": [
            {
                "id": "mensagem-teste",
            }
        ]
    }

    post_mock = Mock(
        return_value=resposta_mock,
    )

    monkeypatch.setattr(
        "app.core.whatsapp.httpx.post",
        post_mock,
    )

    resultado = enviar_codigo_recuperacao(
        "(75) 99999-9999",
        "583241",
    )

    assert resultado == {
        "messages": [
            {
                "id": "mensagem-teste",
            }
        ]
    }

    post_mock.assert_called_once()

    chamada = post_mock.call_args

    assert chamada.args[0] == (
        "https://graph.facebook.com/" "v25.0/" "123456789/messages"
    )

    assert chamada.kwargs["headers"] == {
        "Authorization": "Bearer token-teste",
        "Content-Type": "application/json",
    }

    payload = chamada.kwargs["json"]

    assert payload["to"] == "75999999999"
    assert payload["type"] == "template"

    assert payload["template"]["name"] == "codigo_recuperacao"

    assert payload["template"]["components"][0]["parameters"][0]["text"] == "583241"

    assert payload["template"]["components"][1]["parameters"][0]["text"] == "583241"
