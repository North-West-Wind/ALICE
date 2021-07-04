const { getRandomNumber } = require("../../function.js");

module.exports = {
  name: "rng",
  description: "Random number generator. Generate a random number between range.",
  usage: "<min> <max> [count] [decimal place]",
  aliases: ["randomnumber", "randomnumbergenerator"] ,
  category: 3,
  args: 2,
  async execute(message, args) {
		let count = 1;
		let decimal = -1;
    const min = Number(args[0]);
    const max = Number(args[1]);
    if(isNaN(min) || isNaN(max)) return message.channel.send("Discovered non-number objects!");
    
    if(args[2] && !isNaN(Number(args[2]))) count = parseInt(args[2]);
		if(args[3] !== undefined && !isNaN(parseInt(args[3]))) decimal = parseInt(args[3]);
		let msg = "";
		for(let i = 0; i < count; i++) {
    	var number = decimal < 0 ? getRandomNumber(min, max) : Math.round((getRandomNumber(Number(args[0]), Number(args[1])) + Number.EPSILON) * Math.pow(10, decimal)) / Math.pow(10, decimal);
      if (decimal >= 0) number = Math.round((number + Number.EPSILON) * Math.pow(10, decimal)) / Math.pow(10, decimal);
			msg += number + "\n";
		}
    await message.channel.send(msg);
  }
}