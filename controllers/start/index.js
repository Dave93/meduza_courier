require("dotenv").config();
const { Composer, Scenes } = require("telegraf");
const gql = require("gql-query-builder");

const start = new Scenes.WizardScene(
  "start",
  async (ctx) => {
    await ctx.replyWithHTML("<b>Здравствуйте! Введите логин.</b>");

    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.session.userLogin = ctx.message.text;
    await ctx.replyWithHTML("<b>Введите пароль</b>");
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.session.userPassword = ctx.message.text;
    const { query, variables } = await gql.mutation({
      operation: "",
    });
  }
);

module.exports = start;
