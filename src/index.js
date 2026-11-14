
export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return new Response("AVIATOR ANALYST 2.0 is online!");
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");

    if (!env.WEBHOOK_SECRET || secret !== env.WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 403 });
    }

    const update = await request.json();
    const message = update.message;

    if (!message || !message.chat) {
      return new Response("OK");
    }

    const chatId = message.chat.id;
    const text = (message.text || "").trim();

    let reply = "Message received. Try /help.";

    if (text === "/start") {
      reply =
        "Welcome to AVIATOR ANALYST 2.0!\n\n" +
        "Crash Round Statistical Analysis Bot\n\n" +
        "/start - Start bot\n" +
        "/help - Show commands\n" +
        "/status - System status";
    } else if (text === "/help") {
      reply =
        "AVIATOR ANALYST 2.0\n\n" +
        "/start - Start bot\n" +
        "/help - Show commands\n" +
        "/status - System status";
    } else if (text === "/status") {
      reply =
        "System: ONLINE\n" +
        "Analysis engine: UNDER DEVELOPMENT\n" +
        "Prediction accuracy: NOT YET TESTED";
    }

    await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: reply
        })
      }
    );

    return new Response("OK");
  }
};
