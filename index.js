require("dotenv").config();
import { Telegraf, Markup, Scenes } from "telegraf";

const LocalSession = require("telegraf-session-local");

const PORT = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== "production";

const startScene = require("./controllers/start");

const bot = new Telegraf(process.env.BOT_TOKEN);

const stage = new Scenes.Stage(
  [
    startScene
  ],
  {
    // default: 'start'
  }
);

bot.launch();
