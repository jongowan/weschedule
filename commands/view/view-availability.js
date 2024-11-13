const { SlashCommandBuilder } = require('discord.js');
const { get5MinTimes, dateFormatter, dataAccessMutex, deepEqual, timeToString } = require('../../shared');
const { readJson, pathExists } = require('fs-extra');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("view-availability")
        .setDescription("View your availability on a day.")
        .addStringOption(option =>
            option.setName('date')
                .setDescription('Provide the date of the span. Use "MM/DD/YYYY" as the format')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const startTime = new Date(Date.parse(interaction.options.getString('date')));
        const stopTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
        const times = get5MinTimes(startTime, stopTime);

        const dateStr = encodeURIComponent(dateFormatter.format(startTime));
        const serverIdStr = encodeURIComponent(interaction.guild.id);
        const userIdStr = encodeURIComponent(interaction.user.id);
        const dirPath = `.data/${dateStr}/${serverIdStr}/${userIdStr}`;
        const filePath = dirPath + "/availability.json";

        const availability = {};
        await dataAccessMutex.runExclusive(async () => {
            if (await pathExists(filePath)) {
                Object.assign(availability, await readJson(filePath));
            }
        });

        let holdObject = null;
        let holdStartTime = new Date(startTime);
        const timeSpans = [];
        times.forEach((time, index) => {
            const curObject = availability[time.toISOString()] ?? null;
            if (!index) {
                holdObject = curObject;
                holdStartTime = time;
            } else if (!deepEqual(holdObject, curObject) || !(times.length - index - 1)) {
                timeSpans.push({
                    start: holdStartTime,
                    stop: time,
                    availability: holdObject
                });
                holdObject = curObject;
                holdStartTime = time;
            }
        });

        const timeSpanMessages = timeSpans.filter((timeSpan) => timeSpan.availability !== null).map((timeSpan) => {
            let message = `${timeToString(timeSpan.start)} - ${timeToString(timeSpan.stop)}: `
            if (timeSpan.availability.type === 'available') {
                message += `priority ${timeSpan.availability.priority} available`;
                if (Object.hasOwn(timeSpan.availability, 'comment')) message += ` with comment "${timeSpan.availability.comment}"`
            } else if (timeSpan.availability.type === 'unknown') {
                message += `${timeSpan.availability.likelihood}% unknown priority ${timeSpan.availability.priority} available`;
                if (Object.hasOwn(timeSpan.availability, 'comment')) message += ` with comment "${timeSpan.availability.comment}"`
            }
            return message;
        });
        let response = `You are unavailable on ${dateFormatter.format(startTime)}`;
        if (timeSpanMessages.length) {
            response = `Availability on ${dateFormatter.format(startTime)}:\n` + timeSpanMessages.join('\n');
        }

        await interaction.editReply(response);
    }
}
