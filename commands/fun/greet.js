const { findUser } = require("../../function.js");
const GREETINGS = [
  "Hello there, <user>!",
  "How's your day, <user>?",
  "Hello! <user>!",
  "<user>! Hi!",
  "Nice to meet you, <user>.",
  "How are things, <user>?",
  "Howdy! <user>!"
];

module.exports = {
  name: 'greet',
  description: 'Greet somebody.',
  usage: "<user | user ID>",
  category: 3,
  args: 1,
  async execute(message, args) {
    var taggedUser = message.author;
    if (args[0]) taggedUser = await findUser(message, args[0]);
    if (!taggedUser) return;
    const chosen = GREETINGS[Math.floor(GREETINGS.length * Math.random())];
    await message.channel.send(chosen.replace(/\<user\>/, `<@${taggedUser.id}>`));
  },
};