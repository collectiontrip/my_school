# chat_handlers.py

import json


async def handle_chat(consumer, data):
    """
    Handles chat messages between users
    """

    message = data.get("message")
    to_user = data.get("to_user")

    if not message or not to_user:
        return

    try:
        to_user = int(to_user)
    except ValueError:
        return

    payload = {
        "type": "chat_message",   # must match AppConsumer.chat_message
        "action": "chat_message",
        "message": message,
        "from_user": consumer.user.username,
        "from_user_id": consumer.user.id,
        "to_user_id": to_user,
    }

    # Send to receiver
    await consumer.channel_layer.group_send(
        f"user_{to_user}",
        payload
    )

    # Echo back to sender
    await consumer.send(
        text_data=json.dumps(payload)
    )