import uuid
import hashlib
import random
import string
from django.utils import timezone
from datetime import datetime as timezone 

def generate_secure_code(prefix="GEN"):
    base = f"{uuid.uuid4().hex}{timezone.now().timestamp()}{''.join(random.choices(string.ascii_letters + string.digits, k=8))}"
    hashed = hashlib.sha256(base.encode()).hexdigest().upper()
    code = f"{prefix}-{hashed[3:7]}{hashed[10:14]}{hashed[20:24]}"
    return code

print(generate_secure_code("ABC"))
