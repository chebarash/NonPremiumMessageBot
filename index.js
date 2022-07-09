require(`dotenv`).config();
const { Telegraf } = require(`telegraf`);
const mongoose = require("mongoose");

const bot = new Telegraf(process.env.TOKEN);

const DataSchema = mongoose.model(
  "Data",
  new mongoose.Schema({
    inline_message_id: String,
    text: String,
  })
);

(async () => {
  await mongoose.connect(process.env.MONGO);

  bot.start(
    async (ctx) =>
      await ctx.reply(
        `This bot provide ability for users to send messages especially for non-premium users. Simply open any of your chats and type <code>@NonPremiumMessageBot something</code> in the message field. Then tap on a result to send.\n\nFor example, try typing <code>@NonPremiumMessageBot funny cat</code> here.`,
        {
          parse_mode: `HTML`,
          reply_markup: {
            inline_keyboard: [
              [{ text: `Try`, switch_inline_query: `funny cat` }],
            ],
          },
        }
      )
  );

  bot.on(
    "inline_query",
    async (ctx) =>
      await ctx.answerInlineQuery(
        ctx.inlineQuery.query.length
          ? [
              {
                type: `article`,
                id: 1,
                title: `Send message for non-premium users:`,
                description: ctx.inlineQuery.from.is_premium
                  ? `You are a premium user, your message will be available for everyone`
                  : ctx.inlineQuery.query,
                input_message_content: {
                  message_text: ctx.inlineQuery.from.is_premium
                    ? `I am a <b>PREMIUM</b> user, so here is my message:\n\n${ctx.inlineQuery.query}`
                    : `This message is only available to non-<b>Telegram Premium™</b> users.`,
                  parse_mode: `HTML`,
                },
                reply_markup: ctx.inlineQuery.from.is_premium
                  ? {}
                  : {
                      inline_keyboard: [
                        [
                          {
                            text: `Read this message`,
                            callback_data: `read_this_message`,
                          },
                        ],
                      ],
                    },
              },
            ]
          : []
      )
  );

  bot.on(
    "chosen_inline_result",
    async ({
      chosenInlineResult: {
        inline_message_id,
        query,
        from: { is_premium },
      },
    }) => {
      if (!is_premium)
        return await new DataSchema({ inline_message_id, text: query }).save();
    }
  );

  bot.action(
    `read_this_message`,
    async (ctx) =>
      await ctx.answerCbQuery(
        ctx.callbackQuery.from.is_premium
          ? `You must unsubscribe from Telegram Premium™ to read this message`
          : (
              await DataSchema.findOne({
                inline_message_id: ctx.callbackQuery.inline_message_id,
              })
            ).text,
        { show_alert: true }
      )
  );

  bot.launch();
})();
