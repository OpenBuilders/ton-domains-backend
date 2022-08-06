import { Ctx, Help, On, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { BotService } from './bot.service';

@Update()
export class BotUpdate {
  constructor(private readonly botService: BotService) {
  }

  @Start()
  async start(@Ctx() ctx: Context) {
    if (ctx.from.is_bot) return;
    await this.botService.storeUser(ctx.from);
    await ctx.reply('Hi - ' + ctx.from.username + '!');
  }

  @Help()
  async handleHelp(@Ctx() ctx: Context) {
    const message = `Hello. It's help of beta dns bot. Just open web app! Good luck 🐳!`;
    await ctx.reply(message);
  }

  @On('message')
  async hears(@Ctx() ctx: Context) {
    if (ctx.from.is_bot) return;

    await ctx.reply(
      'Hm direct messages is not supported now, but have a nice day!',
    );
  }
}
