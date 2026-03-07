# typing_handlers.py
import json

async def handle_typing(consumer, data):
    """
    Handles typing indicator.
    - consumer: instance of AppConsumer
    - data: dict containing 'to_user'
    """
    to_user = data.get("to_user")

    if not to_user:
        return

    payload = {
        "type": "typing",  # Must match AppConsumer.typing method
        "from_user_id": consumer.user.id
    }

    # Send 'typing' event to the recipient
    await consumer.channel_layer.group_send(f"user_{to_user}", payload)