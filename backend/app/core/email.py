import os
import smtplib
from email.message import EmailMessage

from dotenv import load_dotenv

load_dotenv()


class EmailEnvioError(RuntimeError):
    pass


def enviar_codigo_recuperacao(email_destino: str, codigo: str) -> None:
    remetente = os.getenv("SMTP_EMAIL")
    senha = os.getenv("SMTP_PASSWORD")
    servidor = os.getenv("SMTP_HOST", "smtp.gmail.com")
    porta = int(os.getenv("SMTP_PORT", "587"))

    if not remetente or not senha:
        raise EmailEnvioError("Configuração SMTP incompleta.")

    mensagem = EmailMessage()
    mensagem["From"] = remetente
    mensagem["To"] = email_destino
    mensagem["Subject"] = "REAB - Recuperação de senha"

    mensagem.set_content(
        f"Seu código de recuperação é: {codigo}\n\n"
        "Este código expira em 10 minutos.\n"
        "Se você não solicitou a recuperação, ignore este e-mail."
    )

    try:
        with smtplib.SMTP(servidor, porta, timeout=15) as smtp:
            smtp.starttls()
            smtp.login(remetente, senha)
            smtp.send_message(mensagem)

    except (smtplib.SMTPException, OSError) as exc:
        raise EmailEnvioError("Falha ao enviar e-mail.") from exc
