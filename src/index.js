JavaScript

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

      const getRounds = async () =>
        JSON.parse((await env.ROUNDS_DB.get(key)) || "[]");

      const send = async (reply) => {
        const response = await fetch(
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

        if (!response.ok) {
          console.error("Telegram send failed:", await response.text());
        }
      };

      let reply = "Unknown command. Use /help.";

      if (text === "/start" || text === "/help") {
        reply =
          "AVIATOR ANALYST 2.0\n\n" +
          "Statistical Analysis Engine\n\n" +
          "/add 1.45 - Record a round\n" +
          "/stats - Full statistics\n" +
          "/history - Recent rounds\n" +
          "/clear - Delete history\n" +
          "/help - Show commands\n\n" +
          "Analysis describes past results. It cannot guarantee future outcomes.";

      } else if (text.startsWith("/add")) {
        const parts = text.split(/\s+/);
        const value = Number(parts[1]);

        if (
          parts.length !== 2 ||
          !Number.isFinite(value) ||
          value <= 0 ||
          value > 100000
        ) {
          reply = "Usage: /add 1.45";
        } else {
          const rounds = await getRounds();

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
        const rounds = await getRounds();

        reply = rounds.length
          ? "RECENT ROUNDS\n\n" +
            rounds.slice(-10).reverse()
              .map((r, i) =>
                (i + 1) + ". " + Number(r.value).toFixed(2) + "x"
              ).join("\n")
          : "No rounds recorded yet. Try /add 1.45";

      } else if (text === "/stats") {
        const rounds = await getRounds();

        if (!rounds.length) {
          reply = "No data yet. Use /add 1.45";
        } else {
          const values = rounds.map(r => Number(r.value));
          const sorted = [...values].sort((a, b) => a - b);
          const sum = values.reduce((a, b) => a + b, 0);

          const middle = Math.floor(sorted.length / 2);
          const median = sorted.length % 2
            ? sorted[middle]
            : (sorted[middle - 1] + sorted[middle]) / 2;

          const ranges = [
            { label: "Below 1.5x", test: v => v < 1.5 },
            { label: "1.5x to below 2x", test: v => v >= 1.5 && v < 2 },
            { label: "2x to below 5x", test: v => v >= 2 && v < 5 },
            { label: "5x to below 10x", test: v => v >= 5 && v < 10 },
            { label: "10x and above", test: v => v >= 10 }
          ];

          const distribution = ranges.map(range => {
            const count = values.filter(range.test).length;
            const percent = (count / values.length * 100).toFixed(1);
            return range.label + ": " + count + " (" + percent + "%)";
          }).join("\n");

          const category = v => v < 2 ? "LOW" : "HIGH";

          let currentStreak = 1;
          let longestLow = 0;
          let longestHigh = 0;
          let lowRun = 0;
          let highRun = 0;

          for (const value of values) {
            if (value < 2) {
              lowRun++;
              highRun = 0;
            } else {
              highRun++;
              lowRun = 0;
            }

            longestLow = Math.max(longestLow, lowRun);
            longestHigh = Math.max(longestHigh, highRun);
          }

          const lastCategory = category(values[values.length - 1]);

          for (let i = values.length - 2; i >= 0; i--) {
            if (category(values[i]) === lastCategory) {
              currentStreak++;
            } else {
              break;
            }
          }

          reply =
            "AVIATOR ANALYST 2.0\n\n" +
            "STATISTICS\n" +
            "Rounds: " + values.length + "\n" +
            "Average: " + (sum / values.length).toFixed(2) + "x\n" +
            "Median: " + median.toFixed(2) + "x\n" +
            "Lowest: " + sorted[0].toFixed(2) + "x\n" +
            "Highest: " + sorted[sorted.length - 1].toFixed(2) + "x\n\n" +
            "MULTIPLIER DISTRIBUTION\n" +
            distribution + "\n\n" +
            "STREAK ANALYSIS (<2x = LOW)\n" +
            "Current streak: " + currentStreak + " " + lastCategory + "\n" +
            "Longest LOW streak: " + longestLow + "\n" +
            "Longest HIGH streak: " + longestHigh + "\n\n" +
            "Streaks describe past results, not future predictions.";
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
      console.error("Webhook error:", error);
      return new Response("Internal error", { status: 500 });
    }
  }
};
