import os
import re
from urllib import response

import httpx
from dotenv import load_dotenv
from sqlalchemy import exc


class WhatsAppEnvioError(RuntimeError):
    pass


load_dotenv()


def _obter_configuracao():
    access_token = os.getenv("WHATSAPP_ACCESS_TOKEN")
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
    api_version = os.getenv("WHATSAPP_API_VERSION", "v25.0")
    template_name = os.getenv("WHATSAPP_TEMPLATE_NAME")
    template_language = os.getenv(
        "WHATSAPP_TEMPLATE_LANGUAGE",
        "pt_BR",
    )

    if not access_token:
        raise WhatsAppEnvioError("WHATSAPP_ACCESS_TOKEN não configurado.")

    if not phone_number_id:
        raise WhatsAppEnvioError("WHATSAPP_PHONE_NUMBER_ID não configurado.")

    if not template_name:
        raise WhatsAppEnvioError("WHATSAPP_TEMPLATE_NAME não configurado.")

    return {
        "access_token": access_token,
        "phone_number_id": phone_number_id,
        "api_version": api_version,
        "template_name": template_name,
        "template_language": template_language,
    }


def _normalizar_numero(numero: str) -> str:
    return re.sub(r"\D", "", numero)


def enviar_codigo_recuperacao(
    numero: str,
    codigo: str,
) -> dict:
    config = _obter_configuracao()

    numero_destino = _normalizar_numero(numero)

    url = (
        f"https://graph.facebook.com/"
        f"{config['api_version']}/"
        f"{config['phone_number_id']}/messages"
    )

    headers = {
        "Authorization": f"Bearer {config['access_token']}",
        "Content-Type": "application/json",
    }

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": numero_destino,
        "type": "template",
        "template": {
            "name": config["template_name"],
            "language": {
                "code": config["template_language"],
            },
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {
                            "type": "text",
                            "text": codigo,
                        }
                    ],
                },
                {
                    "type": "button",
                    "sub_type": "url",
                    "index": "0",
                    "parameters": [
                        {
                            "type": "text",
                            "text": codigo,
                        }
                    ],
                },
            ],
        },
    }

    try:
        response = httpx.post(
            url,
            headers=headers,
            json=payload,
            timeout=10.0,
        )

        response.raise_for_status()

    except httpx.RequestError as exc:
        raise WhatsAppEnvioError("Falha ao enviar o código pelo whatsapp.") from exc

    return response.json()
