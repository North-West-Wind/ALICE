module.exports = {
  name: "resume",
  description: "Resume the paused music.",
  usage: " ",
  music(message, serverQueue) {
    if (!message.member.voice.channel)
    return message.channel.send("You are not in a voice channel!");

    if(!serverQueue) {
      return message.channel.send("There is nothing playing.");
    }
    
  if (serverQueue.paused === true) {
    serverQueue.paused = false;
    if(serverQueue.connection.dispatcher)
    serverQueue.connection.dispatcher.resume();
    return message.channel.send("The song playback has been resumed.");
  } else {
    return message.channel.send("The song playback is not stopped.");
  }
  }
}