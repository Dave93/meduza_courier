require("dotenv").config();
const { Telegraf, Markup, Scenes } = require("telegraf");

const LocalSession = require("telegraf-session-local");

const PORT = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== "production";

const startScene = require("./controllers/start");

const bot = new Telegraf(process.env.BOT_TOKEN);

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

bot.command("start", async (ctx) => {
  return ctx.scene.enter("start");
});

bot.launch();