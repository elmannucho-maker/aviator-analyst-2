
import os
import json
import time
import urllib.request
import urllib.parse
import urllib.error

print("AVIATOR ANALYST 2.0 STARTING...", flush=True)

TOKEN = os.getenv("BOT_TOKEN")

if not TOKEN:
    raise RuntimeError("BOT_TOKEN is missing from Render environment variables.")

BASE_URL = f"https://api.telegram.org/bot{TOKEN}/"


def telegram(method, data=None):
    payload = urllib.parse.urlencode(data or {}).encode()

    request = urllib.request.Request(
        BASE_URL + method,
        data=payload
    )

    with urllib.request.urlopen(request, timeout=40) as response:
        result = json.loads(response.read().decode())

    if not result.get("ok"):
        raise RuntimeError(str(result))

    return result


def send_message(chat_id, message):
    telegram("sendMessage", {
        "chat_id": chat_id,
        "text": message
    })


def main():
    print("Connecting to Telegram...", flush=True)

    result = telegram("getMe")
    username = result["result"]["username"]

    print("Connected as @" + username, flush=True)

    telegram("deleteWebhook", {"drop_pending_updates": "false"})

    print("AVIATOR ANALYST 2.0 is running!", flush=True)

    offset = None

    while True:
        try:
            data = {"timeout": 25}

            if offset is not None:
                data["offset"] = offset

            updates = telegram("getUpdates", data)

            for update in updates.get("result", []):
                offset = update["update_id"] + 1

                message = update.get("message", {})
                chat = message.get("chat", {})
                chat_id = chat.get("id")
                user_text = message.get("text", "").strip()

                if not chat_id:
                    continue

                print("Received:", user_text, flush=True)

                if user_text == "/start":
                    send_message(
                        chat_id,
                        "Welcome to AVIATOR ANALYST 2.0!\n\n"
                        "Crash Round Statistical Analysis Bot\n\n"
                        "/start - Start bot\n"
                        "/help - Show commands\n"
                        "/status - System status"
                    )

                elif user_text == "/help":
                    send_message(
                        chat_id,
                        "AVIATOR ANALYST 2.0\n\n"
                        "/start - Start bot\n"
                        "/help - Show commands\n"
                        "/status - System status"
                    )

                elif user_text == "/status":
                    send_message(
                        chat_id,
                        "System: ONLINE\n"
                        "Analysis engine: UNDER DEVELOPMENT\n"
                        "Prediction accuracy: NOT YET TESTED"
                    )

                else:
                    send_message(
                        chat_id,
                        "Message received. Try /help."
                    )

        except Exception as error:
            print("CONNECTION ERROR:", error, flush=True)
            time.sleep(5)


if __name__ == "__main__":
    main()
