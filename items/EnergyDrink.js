const { jsDate2Mysql } = require("../function.js");
const ID = "481b8f8aec3b604db23f205b4ce2f52b447ffe5ab911e3f1";
const { NorthClient } = require("../classes/NorthClient.js");

module.exports = {
  name: "EnergyDrink",
  async run(message, msg, em, itemObject) {
    var newDateSql = jsDate2Mysql(new Date(Date.now() + 86400000));
    const con = await message.pool.getConnection();
    try {
      var [results] = await con.query(`SELECT doubling FROM currency WHERE user_id = '${message.author.id}' AND guild = '${message.guild.id}'`);
      if (results[0].doubling) newDateSql = jsDate2Mysql(new Date(results[0].doubling.getTime() + 86400000));
      await con.query(`UPDATE currency SET doubling = '${newDateSql}' WHERE user_id = '${message.author.id}' AND guild = '${message.guild.id}'`);
      itemObject[ID] -= 1;
      await con.query(`UPDATE inventory SET items = '${escape(JSON.stringify(itemObject))}' WHERE id = '${message.author.id}'`);
      em.setTitle("You drank the Energy Drink!").setDescription("Now you work more efficiently for 24 hours!\nThe amount of money you gain will be doubled during this period!").setFooter("Have a nice day! :)", message.client.user.displayAvatarURL());
    } catch (err) {
      em.setTitle("ERROR!").setDescription("SQL Error! Contact NorthWestWind#1885 for help.").setFooter("Cancelled.", message.client.user.displayAvatarURL());
      NorthClient.storage.error(err);
    }
    con.release();
    await msg.edit(em);
  }
}