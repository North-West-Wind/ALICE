const { updateQueue, setQueue, getQueues } = require("../../helpers/music.js");
module.exports = {
  name: "clear",
  description: "Clear the queue and stop the playing soundtrack. Also resets the volume to 100%.",
  category: 8,
  async execute(message) {
    var serverQueue = getQueues().get(message.guild.id);
    if (!serverQueue || !serverQueue.songs || !Array.isArray(serverQueue.songs)) serverQueue = setQueue(message.guild.id, [], false, false, message.pool);
    if (serverQueue.songs.length < 1) return message.channel.send("The queue is already empty!");
    if ((message.member.voice.channelID !== message.guild.me.voice.channelID) && serverQueue.playing) return await message.channel.send("You have to be in a voice channel to clear the queue when the bot is playing!");
    if (serverQueue && serverQueue.connection != null && serverQueue.connection.dispatcher)
      serverQueue.connection.dispatcher.destroy();
    if (message.guild.me.voice.channel)
      message.guild.me.voice.channel.leave();
    updateQueue(message.guild.id, null, message.pool);
    message.channel.send("The queue has been cleared!");
  }
};
