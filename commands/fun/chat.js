const cleverbot = require("cleverbot-free");
const log = new Map();

module.exports = {
  name: "chat",
  description: "Chat with the bot.",
  usage: "<message>",
  category: 3,
  args: 1,
  async execute(message, args) {
    var past = log.get(message.author.id);
    if (!past || Date.now() - past.lastChat > 1800000) {
      log.set(message.author.id, {
        lastChat: Date.now(),
        messages: []
      });
      past = log.get(message.author.id);
    }
    const response = await cleverbot(args.join(" "), past.messages);
    past.messages.push(args.join(" "));
    past.messages.push(response);
    log.set(message.author.id, past);
    await message.channel.send(response);
  }
}