import random
import string
from datetime import datetime

def generate_meet_link() -> str:
    def segment(length):
        return ''.join(random.choices(string.ascii_lowercase, k=length))
    return f"https://meet.google.com/{segment(3)}-{segment(4)}-{segment(3)}"

async def create_meet_event(
    title: str,
    start_datetime: datetime,
    end_datetime: datetime
) -> str:
    return generate_meet_link()