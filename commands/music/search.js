const ytsr = require("ytsr");
const { decodeHtmlEntity } = require("../../function");
const scdl = require("soundcloud-downloader").default;

module.exports = {
    name: "search",
    description: "Search for soundtracks with given keywords.",
    usage: "<keywords>",
    category: 8,
    args: 1,
    async execute(message, args) {
        const link = args.join(" ");
        if (!link) return await message.channel.send("You didn't provide any keywords!");
        const lines = ["Found these on **YouTube**:"];
        const searched = await ytsr(link, { limit: 20 });
        const video = searched.items.slice(0, 10).map(x => `${++num} - **${decodeHtmlEntity(x.title)} | ${x.url}** : **${!(!!x.live) ? x.duration : "∞"}**`);
        var num = 0;
        if (video.length < 1) lines.push("Sadly, I can't find anything on **YouTube**");
        else lines.concat(video);
        lines.push("Found these on **SoundCloud**:");
        const soundtrack = (await scdl.search({
            limit: 20,
            query: link,
            resourceType: "tracks"
        })).collection.filter(x => !!x.permalink_url).slice(0, 10).map(x => `${++num} - **${x.title} | ${x.permalink_url}** : **${moment.duration(Math.floor(x.duration / 1000), "seconds").format()}**`).slice(0, 10).join("\n");
        num = 0;
        if (soundtrack.length < 1) lines.push("Sadly, I can't find anything on **SoundCloud**");
        else lines.concat(soundtrack);
        await message.channel.send(lines.join("\n"));
    }
}