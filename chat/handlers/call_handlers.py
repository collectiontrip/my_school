# call_handlers.py

import json


async def handle_call(consumer, data):
    """
    Handles call signaling between users

    Supported actions:
    call_request
    call_accept
    call_reject
    call_end
    webrtc_offer
    webrtc_answer
    webrtc_ice
    """

    action = data.get("action")
    to_user = data.get("to_user")

    if not action or not to_user:
        return

    try:
        to_user = int(to_user)
    except ValueError:
        return

    payload = {
        "type": "call_signal",   # must match AppConsumer.call_signal
        "action": action,
        "from_user": consumer.user.username,
        "from_user_id": consumer.user.id,
        "to_user_id": to_user,
    }

    # Attach WebRTC data if needed
    if action in ["webrtc_offer", "webrtc_answer", "webrtc_ice"]:
        payload["data"] = data.get("data")

    # ---------------- Send to receiver ----------------
    await consumer.channel_layer.group_send(
        f"user_{to_user}",
        payload
    )

    # ---------------- Echo to sender ----------------
    await consumer.send(
        text_data=json.dumps(payload)
    )

    # ---------------- Call state tracking ----------------
    if action == "call_request":
        consumer.current_call = to_user

    if action in ["call_end", "call_reject"]:
        if consumer.current_call == to_user:
            consumer.current_call = None