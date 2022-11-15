require("dotenv").config();
const { Composer, Scenes } = require("telegraf");
const gql = require("gql-query-builder");

const { client } = require("../../graphqlConnect");

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
      operation: "tryLogin",
      variables: {
        login: {
          value: ctx.session.userLogin,
          required: true,
        },
        password: {
          value: ctx.message.text,
          required: true,
        },
        tgId: {
          value: ctx.message.from.id,
          required: true,
        },
      },
      fields: ["id"],
    });

    try {
      const { tryLogin } = await client.request(query, variables);
      console.log(tryLogin);
    } catch (error) {
      console.log(error.response.errors);

      if (error.response && error.response.errors) {
        const errors = error.response.errors.map((error) => error.message);
        return ctx.replyWithHTML(errors.join("\n"));
      }
    }
  }
);

module.exports = start;
