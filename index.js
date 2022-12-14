require("dotenv").config();
const { Telegraf, Markup, Scenes } = require("telegraf");
const fastify = require("fastify");
const telegrafPlugin = require("fastify-telegraf");
const gql = require("gql-query-builder");

const { client } = require("./graphqlConnect");

const LocalSession = require("telegraf-session-local");

const { BOT_TOKEN, WEBHOOK_URL } = process.env;
const PORT = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== "production";

const startScene = require("./controllers/start");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.tz.setDefault("Asia/Tashkent");

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

let paymentTypes = {
  cash: "Наличные",
  card: "Карта",
};

app.register(telegrafPlugin, { bot, path: SECRET_PATH });

app.post("/api/sendOrderToCourier", async (req, res) => {
  console.log("send is came");
  const { chatIds, order } = req.body;

  const result = [];

  for (let i = 0; i < chatIds.length; i++) {
    const chatId = chatIds[i].chatId;
    const sign = chatIds[i].sign;

    let message = `<b>Новый заказ №${
      order.id
    }</b>\n<b>Время заказа:</b> ${dayjs(order.delivery_time)
      .tz("Asia/Tashkent")
      .format("DD.MM.YYYY HH:mm:ss")}\n<b>Адрес:</b> ${
      order.delivery_address
    }\n<b>Сумма заказа:</b> ${new Intl.NumberFormat("ru").format(
      order.order_price
    )} сум.\n<b>Способ оплаты:</b> ${
      paymentTypes[order.payment_type]
    }\n<b>Список товаров:</b>\n`;

    order.order_items_orders.forEach((item) => {
      message += `   ${item.order_items_products.name} - ${item.quantity} шт.\n`;
    });

    try {
      console.log(
        JSON.stringify({
          inline_keyboard: [
            [
              {
                text: "Комментарии",
                web_app: {
                  url: `${process.env.WEB_LINK}/comments/?order_id=${order.id}&sign=${sign}`,
                },
              },
            ],
            [
              {
                text: "Подтвердить заказ",
                callback_data: `confirmOrder/${order.id}`,
              },
            ],
          ],
        })
      );
      const buff = Buffer.from(sign, "hex");
      const text = buff.toString("utf-8");
      const randomString = text.substring(0, 6);
      const base64data = text.substring(6);
      const buff2 = Buffer.from(base64data, "base64");
      const text2 = buff2.toString("utf-8");
      const phone = text2.split("|")[0];
      const tgId = text2.split("|")[1];
      const { message_id } = await bot.telegram.sendMessage(chatId, message, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Комментарии",
                web_app: {
                  url: `${process.env.WEB_LINK}/comments/?order_id=${order.id}&sign=${sign}`,
                },
              },
            ],
            [
              {
                text: "Подтвердить заказ",
                callback_data: `confirmOrder/${order.id}/${phone}`,
              },
            ],
          ],
        },
      });
      result.push({
        chatId,
        messageId: message_id,
      });
    } catch (error) {
      console.log(error);
    }

    const { message_id: location_id } = await bot.telegram.sendLocation(
      chatId,
      order.to_lat,
      order.to_lon
    );

    result.push({
      chatId,
      messageId: location_id,
    });
  }
  return res.send(result);
});

app.post("/api/deleteMessages", async (req, res) => {
  const { chats } = req.body;

  if (chats.length > 0) {
    for (let i = 0; i < chats.length; i++) {
      const { chatId, messageId } = chats[i];
      console.log("delete message", [chatId, messageId]);

      await bot.telegram.deleteMessage(chatId, messageId);
    }
  }

  return res.send("ok");
});

bot.action(/confirmOrder\/(.+)\/(.+)/, async (ctx) => {
  const orderId = ctx.match[1];
  const phone = ctx.match[2];
  const buff = Buffer.from(`${phone}|${ctx.from.id}`);
  const base64data = buff.toString("base64");
  // random string with 6 characters
  const randomString = Math.random().toString(36).substring(2, 8);
  const hexBuffer = Buffer.from(`${randomString}${base64data}`);
  const hex = hexBuffer.toString("hex");
  const sign = hex;
  ctx.session.sign = sign;
  console.log(ctx.message);
  const { query, variables } = await gql.mutation({
    operation: "approveOrder",
    variables: {
      orderId: {
        value: +orderId,
        type: "Int",
        required: true,
      },
      sign: {
        value: sign,
        type: "String",
        required: true,
      },
    },
    fields: ["id"],
  });

  try {
    const { approveOrder } = await client.request(query, variables);

    console.log(approveOrder);
  } catch (e) {
    console.log(e);
  }
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
