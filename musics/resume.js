module.exports = {
  name: "resume",
  description: "Resume the music.",
  music(message, serverQueue) {
    if (!message.member.voice.channel)
    return message.channel.send("You are not in a voice channel!");

  if (serverQueue.playing === false) {
    serverQueue.playing = true;
    serverQueue.connection.dispatcher.resume();
    return message.channel.send("The song playback has been resumed.");
  } else {
    return message.channel.send("The song playback is not stopped.");
  }
  }
}