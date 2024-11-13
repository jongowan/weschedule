const { SlashCommandBuilder } = require('discord.js');
const { ensureDir, writeJson, pathExists, readJson } = require('fs-extra');
const { dataAccessMutex, get5MinTimes, dateFormatter } = require('../../shared');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-availability')
        .setDescription('Add a time span of availability.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('available')
                .setDescription('You are available during the time span.')
                .addStringOption(option =>
                    option.setName('date')
                        .setDescription('Provide the date of the span. Use "MM/DD/YYYY" as the format')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('start-time')
                        .setDescription('Provide the starting time of the span. Use "HH:MM PM" as the format.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('stop-time')
                        .setDescription('Provide the ending time of the span. Use "HH:MM PM" as the format.')
                        .setRequired(true))
                .addNumberOption(option =>
                    option.setName('priority')
                        .setDescription('Provide a priority level. A higher number will be considered first when scheduling.')
                        .setRequired(true)
                        .setMinValue(1))
                .addStringOption(option =>
                    option.setName('comment')
                        .setDescription('Optionally, add a comment.')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unknown')
                .setDescription('You might become available during the time span, but you aren\'t sure.')
                .addStringOption(option =>
                    option.setName('date')
                        .setDescription('Provide the date of the span. Use "MM/DD/YYYY" as the format')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('start-time')
                        .setDescription('Provide the starting time of the span. Use "HH:MM PM" as the format.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('stop-time')
                        .setDescription('Provide the ending time of the span. Use "HH:MM PM" as the format.')
                        .setRequired(true))
                .addNumberOption(option =>
                    option.setName('likelihood')
                        .setDescription('Provide an estimate of how likely you will become available using a percentage.')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(100))
                .addNumberOption(option =>
                    option.setName('priority')
                        .setDescription('Provide a priority level. A higher number will be considered first when scheduling.')
                        .setRequired(true)
                        .setMinValue(1))
                .addStringOption(option =>
                    option.setName('comment')
                        .setDescription('Optionally, add a comment.')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unavailable')
                .setDescription('You are unavailable during the time span.')
                .addStringOption(option =>
                    option.setName('date')
                        .setDescription('Provide the date of the span. Use "MM/DD/YYYY" as the format')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('start-time')
                        .setDescription('Provide the starting time of the span. Use "HH:MM PM" as the format.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('stop-time')
                        .setDescription('Provide the ending time of the span. Use "HH:MM PM" as the format.')
                        .setRequired(true))),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const date = new Date(Date.parse(interaction.options.getString('date')));
        const startTime = new Date(Date.parse(interaction.options.getString('date') + ' ' + interaction.options.getString('start-time')));
        const stopTime = new Date(Date.parse(interaction.options.getString('date') + ' ' + interaction.options.getString('stop-time')));
        const times = get5MinTimes(startTime, stopTime);

        const dateStr = encodeURIComponent(dateFormatter.format(date));
        const serverIdStr = encodeURIComponent(interaction.guild.id);
        const userIdStr = encodeURIComponent(interaction.user.id);
        const dirPath = `.data/${dateStr}/${serverIdStr}/${userIdStr}`;
        const filePath = dirPath + "/availability.json";

        await dataAccessMutex.runExclusive(async () => {
            const availability = {};
            if (await pathExists(filePath)) {
                Object.assign(availability, await readJson(filePath))
            } else {
                await ensureDir(dirPath);
            }

            const subcommand = interaction.options.getSubcommand();
            if (subcommand === 'available') {
                const priority = interaction.options.getNumber('priority');
                const comment = interaction.options.getString('comment');
                times.forEach(time => {
                    const obj = availability[time.toISOString()] = {};
                    obj.type = 'available';
                    obj.priority = priority;
                    if (comment != null)
                        obj.comment = comment;
                })
            } else if (subcommand === 'unknown') {
                const likelihood = interaction.options.getNumber('likelihood');
                const priority = interaction.options.getNumber('priority');
                const comment = interaction.options.getString('comment');
                times.forEach(time => {
                    const obj = availability[time.toISOString()] = {};
                    obj.type = 'unknown';
                    obj.likelihood = likelihood;
                    obj.priority = priority;
                    if (comment != null)
                        obj.comment = comment;
                });
            } else if (subcommand === 'unavailable') {
                times.forEach(time => {
                    delete availability[time.toISOString()];
                });
            } else {
                await interaction.editReply("The availability level you've specified is not supported.");
            }

            await writeJson(filePath, availability);
        });

        await interaction.editReply("Availability updated successfully.");
    },
};
