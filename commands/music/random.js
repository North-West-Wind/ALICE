const { updateQueue, getQueues } = require("../../helpers/music.js");

module.exports = {
  name: "random",
  description: "Play the queue randomly.",
  aliases: ["rnd"],
  category: 8,
  async execute(message) {
    var serverQueue = getQueues().get(message.guild.id);
    if (!serverQueue || !serverQueue.songs || !Array.isArray(serverQueue.songs)) serverQueue = setQueue(message.guild.id, [], false, false, message.pool);
    serverQueue.random = !serverQueue.random;
    try {
      await updateQueue(message.guild.id, serverQueue, message.pool);
      if (serverQueue.random) await message.channel.send("The queue will be played randomly.");
      else await message.channel.send("The queue will be played in order.");
    } catch (err) {
      await message.reply("there was an error trying to update the status!");
    }
  }
}