
import json
import time
import urllib.request
import urllib.parse

print("AVIATOR ANALYST 2.0 STARTING...", flush=True)

TOKEN = input("Enter your Telegram bot token: ").strip()

BASE_URL = f"https://api.telegram.org/bot{TOKEN}/"


def telegram(method, data=None):
    payload = urllib.parse.urlencode(data or {}).encode()

    request = urllib.request.Request(
        BASE_URL + method,
        data=payload
    )

    with urllib.request.urlopen(request, timeout=40) as response:
        return json.loads(response.read().decode())


def send_message(chat_id, message):
    return telegram("sendMessage", {
        "chat_id": chat_id,
        "text": message
    })


def main():
    print("Connecting to Telegram...", flush=True)

    result = telegram("getMe")

    if not result.get("ok"):
        raise RuntimeError("Telegram connection failed")

    print("Connected as @" + result["result"]["username"], flush=True)

    telegram("deleteWebhook", {"drop_pending_updates": "false"})

    print("AVIATOR ANALYST 2.0 is running...", flush=True)
    print("WAITING FOR TELEGRAM MESSAGES...", flush=True)

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

                print("MESSAGE RECEIVED:", user_text, flush=True)

                if not chat_id:
                    continue

                if user_text == "/start":
                    send_message(
                        chat_id,
                        "Welcome to AVIATOR ANALYST 2.0!\n\n"
                        "Crash Round Statistical Analysis Bot\n\n"
                        "Commands:\n"
                        "/start - Start bot\n"
                        "/help - Show commands\n"
                        "/status - Check system status"
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
                        "I received your message. Try /help."
                    )

        except Exception as error:
            print("CONNECTION ERROR:", error, flush=True)
            time.sleep(5)


if __name__ == "__main__":
    main()
