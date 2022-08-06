import { Update } from 'nestjs-telegraf';
import { BotService } from './bot.service';

@Update()
export class BotAction {
  constructor(private botService: BotService) {
  }
}
