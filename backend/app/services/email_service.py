"""Serviço de envio de email via Resend.

Este é o ÚNICO arquivo que importa a lib `resend`. Se amanhã trocarmos de provedor
(SendGrid, SES), só este arquivo muda.
"""
import logging

import resend

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _init_resend() -> None:
    """Configura a API key do Resend. Chamado antes de cada envio."""
    if not settings.RESEND_API_KEY:
        raise RuntimeError(
            "RESEND_API_KEY não configurada. Defina no .env antes de enviar emails."
        )
    resend.api_key = settings.RESEND_API_KEY


def send_verification_email(to_email: str, code: str) -> None:
    """
    Envia um email de verificação com código de 6 dígitos.

    Levanta exceção se o envio falhar — quem chama deve capturar
    e decidir se mantém o registro no banco ou faz rollback.
    """
    _init_resend()

    from_field = f"{settings.RESEND_FROM_NAME} <{settings.RESEND_FROM_EMAIL}>"

    html_body = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #0f172a; color: #e2e8f0; border-radius: 16px;">
      <h1 style="color: #10b981; font-size: 22px; margin: 0 0 16px 0;">FortexaGym</h1>
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
        Use o código abaixo para confirmar seu email e finalizar a criação da sua conta.
      </p>
      <div style="background: #1e293b; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">
          Seu código de verificação
        </p>
        <p style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #10b981; margin: 0; font-family: 'SF Mono', Menlo, monospace;">
          {code}
        </p>
      </div>
      <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 16px 0 0 0;">
        Este código expira em <strong>15 minutos</strong>. Se você não solicitou, ignore este email.
      </p>
    </div>
    """

    text_body = (
        f"FortexaGym - Código de verificação\n\n"
        f"Seu código: {code}\n\n"
        f"Este código expira em 15 minutos. Se você não solicitou, ignore este email."
    )

    try:
        response = resend.Emails.send(
            {
                "from": from_field,
                "to": [to_email],
                "subject": "FortexaGym — Código de verificação",
                "html": html_body,
                "text": text_body,
            }
        )
        logger.info("E-mail de verificação enviado; id=%s", response.get("id"))
    except Exception as exc:
        logger.error("Falha no envio de e-mail de verificação.")
        raise