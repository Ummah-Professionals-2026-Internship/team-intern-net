import secrets
import urllib.parse
from datetime import datetime

def generate_meet_link() -> str:
    """
    Generates a secure, cryptographically random system-owned Jitsi meeting room link.
    """
    base_url = "https://meet.jit.si/"
    platform_prefix = "UmmahProfessionals-Session-"
    
    # Generate an unguessable 12-character URL safe token (e.g., x9A_2kLp9_mQ)
    unique_token = secrets.token_urlsafe(12)
    
    room_name = f"{platform_prefix}{unique_token}"
    safe_room_name = urllib.parse.quote(room_name)
    
    return f"{base_url}{safe_room_name}"

async def create_meet_event(
    title: str,
    start_datetime: datetime,
    end_datetime: datetime
) -> str:
    """
    Wrapper function to maintain backward compatibility with routers calling async event creation.
    """
    return generate_meet_link()