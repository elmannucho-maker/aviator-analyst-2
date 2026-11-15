
export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return new Response("AVIATOR ANALYST 2.0 is online!");
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const secret = request.headers.get(
      "X-Telegram-Bot-Api-Secret-Token"
    );

    if (!env.WEBHOOK_SECRET || secret !== env.WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 403 });
    }

    try {
      const update = await request.json();
      const message = update.message;

      if (!message || !message.chat) {
        return new Response("OK");
      }

      const chatId = message.chat.id;
      const text = (message.text || "").trim();
      const key = "rounds:" + chatId;

      let reply = "Unknown command. Use /help.";

      const send = async (text) => {
        await fetch(
          `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text
            })
          }
        );
      };

      if (text === "/start" || text === "/help") {
        reply =
          "AVIATOR ANALYST 2.0\n\n" +
          "Crash Round Statistical Analysis\n\n" +
          "/add 1.45 - Record a round\n" +
          "/stats - View statistics\n" +
          "/history - Recent rounds\n" +
          "/clear - Delete your history\n" +
          "/help - Show commands\n\n" +
          "This bot analyses recorded results. " +
          "It cannot guarantee future crash outcomes.";

      } else if (text.startsWith("/add")) {
        const parts = text.split(/\s+/);
        const value = Number(parts[1]);

        if (
          parts.length !== 2 ||
          !Number.isFinite(value) ||
          value <= 0 ||
          value > 100000
        ) {
          reply = "Usage: /add 1.45\nEnter a valid multiplier.";
        } else {
          const rounds = JSON.parse(
            (await env.ROUNDS_DB.get(key)) || "[]"
          );

          rounds.push({
            value,
            time: new Date().toISOString()
          });

          await env.ROUNDS_DB.put(key, JSON.stringify(rounds));

          reply =
            "Round recorded: " + value.toFixed(2) + "x\n" +
            "Total recorded rounds: " + rounds.length;
        }

      } else if (text === "/history") {
        const rounds = JSON.parse(
          (await env.ROUNDS_DB.get(key)) || "[]"
        );

        reply = rounds.length
          ? "RECENT ROUNDS\n\n" +
            rounds.slice(-10).reverse()
              .map((r, i) =>
                (i + 1) + ". " + Number(r.value).toFixed(2) + "x"
              ).join("\n")
          : "No rounds recorded yet. Try /add 1.45";

      } else if (text === "/stats") {
        const rounds = JSON.parse(
          (await env.ROUNDS_DB.get(key)) || "[]"
        );

        if (!rounds.length) {
          reply = "No data yet. Record rounds using /add 1.45";
        } else {
          const values = rounds.map(r => Number(r.value));
          const sorted = [...values].sort((a, b) => a - b);
          const sum = values.reduce((a, b) => a + b, 0);
          const middle = Math.floor(sorted.length / 2);
          const median = sorted.length % 2
            ? sorted[middle]
            : (sorted[middle - 1] + sorted[middle]) / 2;

          const below2 = values.filter(v => v < 2).length;
          const above2 = values.filter(v => v >= 2).length;
          const above10 = values.filter(v => v >= 10).length;

          reply =
            "AVIATOR STATISTICS\n\n" +
            "Rounds: " + values.length + "\n" +
            "Average: " + (sum / values.length).toFixed(2) + "x\n" +
            "Median: " + median.toFixed(2) + "x\n" +
            "Lowest: " + sorted[0].toFixed(2) + "x\n" +
            "Highest: " + sorted[sorted.length - 1].toFixed(2) + "x\n\n" +
            "Below 2x: " + below2 + "\n" +
            "2x and above: " + above2 + "\n" +
            "10x and above: " + above10;
        }

      } else if (text === "/clear") {
        await env.ROUNDS_DB.delete(key);
        reply = "Your recorded round history has been cleared.";

      } else {
        reply = "Unknown command. Use /help.";
      }

      await send(reply);
      return new Response("OK");

    } catch (error) {
      return new Response("Internal error", { status: 500 });
    }
  }
};
