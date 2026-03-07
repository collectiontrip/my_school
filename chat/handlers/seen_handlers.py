# seen_handlers.py
import json

async def handle_seen(consumer, data):
    """
    Handles marking messages as seen.
    - consumer: instance of AppConsumer
    - data: dict containing 'to_user'
    """
    to_user = data.get("to_user")

    if not to_user:
        return

    payload = {
        "type": "seen",  # Must match AppConsumer.seen method
        "from_user_id": consumer.user.id
    }

    # Send 'seen' event to the recipient
    await consumer.channel_layer.group_send(f"user_{to_user}", payload)