const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('schedule')
        .setDescription('Calculate the available time spans for a scheduled event and return them in sorted order.')
        .addStringOption(option =>
            option.setName('date')
                .setDescription('Provide the date of the span. Use "MM/DD/YYYY" as the format.')
                .setRequired(true))
        .addNumberOption(option =>
            option.setName('minimum-minutes')
                .setDescription('Provide the minimum time in minutes of the span.')
                .setRequired(true)
                .setMinValue(5))
        .addNumberOption(option =>
            option.setName('minimum-availability')
                .setDescription('Provide the minimum amount of available users for the span.')
                .setRequired(true)
                .setMinValue(1)),
    async execute(interaction) {
        interaction.reply({ ephemeral: true, content: "HA! You thought I was that fast? Nah, this is coming soon though." });
    }
};
