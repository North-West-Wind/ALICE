const { setQueue, updateQueue, getQueues } = require("../../helpers/music.js");

module.exports = {
  name: "repeat",
  description: "Toggle repeat of a soundtrack.",
  aliases: ["rep", "rp"],
  category: 8,
  async execute(message) {
    var serverQueue = getQueues().get(message.guild.id);
    if (!serverQueue || !serverQueue.songs || !Array.isArray(serverQueue.songs)) serverQueue = setQueue(message.guild.id, [], false, false, message.pool);
    serverQueue.repeating = !serverQueue.repeating;
    if (serverQueue.repeating && serverQueue.looping) {
      serverQueue.looping = false;
      message.channel.send("Disabled looping to prevent conflict.");
    }
    try {
      await updateQueue(message.guild.id, serverQueue, message.pool);
      if (serverQueue.repeating) await message.channel.send("The queue is now being repeated.");
      else await message.channel.send("The queue is no longer being repeated.");
    } catch (err) {
      await message.reply("there was an error trying to update the status!");
    }
  }
}