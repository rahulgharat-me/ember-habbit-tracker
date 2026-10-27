"""Email notifications (SMTP). Failures are logged, never raised: email is best-effort."""

import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import Settings
from app.models import AccessRequest

logger = logging.getLogger(__name__)
TIMEOUT_SECONDS = 15


def send_email(settings: Settings, subject: str, body: str) -> bool:
    if not settings.email_configured:
        logger.info("SMTP not configured; skipping email %r", subject)
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from or settings.smtp_username
    message["To"] = settings.notify_email
    message.set_content(body)

    context = ssl.create_default_context()
    try:
        # Port 465 speaks TLS from the start; anything else (587, 25) upgrades with STARTTLS.
        if settings.smtp_port == 465:
            server = smtplib.SMTP_SSL(
                settings.smtp_host, settings.smtp_port, timeout=TIMEOUT_SECONDS, context=context
            )
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=TIMEOUT_SECONDS)
            server.starttls(context=context)
        with server:
            if settings.smtp_username:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
    except (OSError, smtplib.SMTPException):
        logger.exception("Could not send email %r", subject)
        return False
    return True


def notify_access_request(settings: Settings, request: AccessRequest) -> bool:
    who = f"@{request.login}" + (f" ({request.name})" if request.name else "")
    review_url = f"{settings.public_url.rstrip('/')}/admin/access"
    return send_email(
        settings,
        subject=f"Access request from @{request.login}",
        body=(
            f"{who} asked for access to your habit tracker.\n\n"
            f"GitHub profile: https://github.com/{request.login}\n"
            f"Review the request: {review_url}\n"
        ),
    )
