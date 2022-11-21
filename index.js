require("dotenv").config();
const { Telegraf, Markup, Scenes } = require("telegraf");
const fastify = require("fastify");
const telegrafPlugin = require("fastify-telegraf");

const LocalSession = require("telegraf-session-local");

const { BOT_TOKEN, WEBHOOK_URL } = process.env;
const PORT = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== "production";

const startScene = require("./controllers/start");

const bot = new Telegraf(BOT_TOKEN);

const stage = new Scenes.Stage([startScene], {
  // default: 'start'
});

bot.use(new LocalSession({ database: "session.json" }).middleware());

stage.command("start", (ctx) => {
  ctx.session = {};
  return ctx.scene.enter("start");
});

stage.command("quit", async (ctx) => {
  ctx.session = {};
  return ctx.telegram.leaveChat(ctx.message.chat.id);
});

bot.use(stage.middleware());

bot.command("quit", async (ctx) => {
  // Explicit usage
  await ctx.telegram.leaveChat(ctx.message.chat.id);

  // Using context shortcut
  await ctx.leaveChat();
});

bot.start(async (ctx) => ctx.scene.enter("start"));

bot.hears("/start", async (ctx) => {
  ctx.session = {};
  ctx.scene.enter("start");
});

bot.hears("/quit", async (ctx) => {
  ctx.session = {};
  // Explicit usage
  await ctx.telegram.leaveChat(ctx.message.chat.id);

  // Using context shortcut
  await ctx.leaveChat();
});

// bot.hears("Просмотреть список заказов", async (ctx) => {
//   return ctx.replyWithHTML("На стадии разработки");
// });

bot.command("start", async (ctx) => {
  return ctx.scene.enter("start");
});

const app = fastify({
  logger: true,
});

const SECRET_PATH = `/telegraf/${bot.secretPathComponent()}`;
app.register(telegrafPlugin, { bot, path: SECRET_PATH });

app.post("/api/sendOrderToCourier", async (req, res) => {
  const { chatIds, order } = req.body;

  const result = [];

  await chatIds.forEach(async (chatId) => {
    const { message_id } = await bot.telegram.sendMessage(
      chatId,
      `Новый заказ №${order.id} на сумму ${order.totalPrice} руб.`
    );
    result.push({
      chatId,
      messageId: message_id,
    });
  });
  return res.send("OK");
});

if (dev) {
  bot.launch();
} else {
  if (!WEBHOOK_URL) throw new Error('"WEBHOOK_URL" env var is required!');
  bot.telegram.setWebhook(WEBHOOK_URL + SECRET_PATH).then(() => {
    console.log("Webhook is set on", WEBHOOK_URL + SECRET_PATH);
  });

  app.listen(PORT).then(() => {
    console.log("Listening on port", PORT);
  });
}
