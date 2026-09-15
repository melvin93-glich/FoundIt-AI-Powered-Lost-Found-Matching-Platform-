import smtplib
import logging
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any
from config import settings

logger = logging.getLogger(__name__)

def _send_email_sync(to_email: str, subject: str, html_content: str) -> bool:
    """Synchronous Gmail SMTP email sending logic using SSL (Port 465)."""
    if not settings.EMAIL_ADDRESS or not settings.EMAIL_APP_PASSWORD:
        logger.warning(
            "EMAIL_ADDRESS or EMAIL_APP_PASSWORD not set in config. "
            "Email notification logged but not dispatched via SMTP."
        )
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_ADDRESS}>"
        msg["To"] = to_email

        html_part = MIMEText(html_content, "html")
        msg.attach(html_part)

        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as server:
            server.login(settings.EMAIL_ADDRESS, settings.EMAIL_APP_PASSWORD)
            server.sendmail(settings.EMAIL_ADDRESS, [to_email], msg.as_string())

        logger.info(f"✓ Email successfully dispatched to {to_email} with subject: '{subject}'")
        return True
    except Exception as e:
        logger.error(f"⚠ Failed to send email to {to_email}: {e}")
        return False


async def send_email_async(to_email: str, subject: str, html_content: str) -> bool:
    """Asynchronous wrapper offloading SMTP network I/O to a background thread."""
    if not to_email:
        return False
    return await asyncio.to_thread(_send_email_sync, to_email, subject, html_content)


def build_candidate_match_email(
    user_name: str,
    lost_item: Dict[str, Any],
    found_item: Dict[str, Any],
    score_pct: int,
    match_link: str
) -> str:
    lost_title = lost_item.get("title", "Lost Item")
    found_title = found_item.get("title", "Found Item")
    found_location = found_item.get("location", "Unknown Location")
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FAF8F5; color: #1E2022; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #E5E2DC; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }}
            .header {{ background-color: #2E4A3E; color: #ffffff; padding: 24px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 22px; }}
            .content {{ padding: 24px; line-height: 1.6; }}
            .match-box {{ background-color: #FAF8F5; border: 1px solid #E5E2DC; border-radius: 6px; padding: 16px; margin: 20px 0; }}
            .score-badge {{ display: inline-block; background-color: #2E4A3E; color: #ffffff; font-weight: bold; font-size: 14px; padding: 4px 12px; border-radius: 12px; margin-bottom: 12px; }}
            .cta-button {{ display: inline-block; background-color: #2E4A3E; color: #ffffff; text-decoration: none; font-weight: bold; padding: 12px 24px; border-radius: 6px; margin-top: 16px; }}
            .footer {{ background-color: #1E2022; color: #A2A8AE; padding: 16px; text-align: center; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔍 FoundIt AI — Match Alert</h1>
            </div>
            <div class="content">
                <p>Hello <strong>{user_name}</strong>,</p>
                <p>Good news! Our AI engine has detected a potential match for your reported lost item: <strong>"{lost_title}"</strong>.</p>
                
                <div class="match-box">
                    <div class="score-badge">{score_pct}% Match Confidence</div>
                    <h3 style="margin: 0 0 8px 0; color: #1E2022;">Candidate Found Item: {found_title}</h3>
                    <p style="margin: 4px 0; color: #4A5056;">📍 <strong>Location Found:</strong> {found_location}</p>
                    <p style="margin: 4px 0; color: #4A5056;">📝 <strong>Description:</strong> {found_item.get('description', '')}</p>
                </div>

                <p>Click below to inspect candidate details and score breakdown:</p>
                <p style="text-align: center;">
                    <a href="{match_link}" class="cta-button">View Possible Match</a>
                </p>
            </div>
            <div class="footer">
                FoundIt AI Lost & Found Platform • Automated Notification
            </div>
        </div>
    </body>
    </html>
    """


def build_confirmed_match_email(
    user_name: str,
    item_title: str,
    other_party_name: str,
    contact_email: str,
    contact_phone: Optional[str],
    match_link: str
) -> str:
    phone_info = f"<li><strong>Phone:</strong> {contact_phone}</li>" if contact_phone else ""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FAF8F5; color: #1E2022; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #E5E2DC; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }}
            .header {{ background-color: #2E4A3E; color: #ffffff; padding: 24px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 22px; }}
            .content {{ padding: 24px; line-height: 1.6; }}
            .contact-box {{ background-color: #E2EAE6; border: 1px solid #2E4A3E; border-radius: 6px; padding: 16px; margin: 20px 0; }}
            .cta-button {{ display: inline-block; background-color: #2E4A3E; color: #ffffff; text-decoration: none; font-weight: bold; padding: 12px 24px; border-radius: 6px; margin-top: 16px; }}
            .footer {{ background-color: #1E2022; color: #A2A8AE; padding: 16px; text-align: center; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 FoundIt AI — Match Confirmed!</h1>
            </div>
            <div class="content">
                <p>Hello <strong>{user_name}</strong>,</p>
                <p>Great news! The match for your item <strong>"{item_title}"</strong> has been officially confirmed.</p>
                
                <div class="contact-box">
                    <h3 style="margin: 0 0 8px 0; color: #2E4A3E;">Contact Details for {other_party_name}:</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #1E2022;">
                        <li><strong>Email:</strong> <a href="mailto:{contact_email}">{contact_email}</a></li>
                        {phone_info}
                    </ul>
                </div>

                <p>You can now reach out directly to arrange item recovery.</p>
                <p style="text-align: center;">
                    <a href="{match_link}" class="cta-button">View Match Page</a>
                </p>
            </div>
            <div class="footer">
                FoundIt AI Lost & Found Platform • Automated Notification
            </div>
        </div>
    </body>
    </html>
    """
