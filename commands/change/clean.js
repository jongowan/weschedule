const { SlashCommandBuilder } = require('discord.js');
const { ensureDir, remove } = require('fs-extra');
const { readdir } = require('fs');
const { dataAccessMutex } = require('../../shared');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("clean")
        .setDescription("Clean availability from past dates."),
    async execute(interaction) {
        await interaction.deferReply({ "ephemeral": true });
        const dataDir = '.data';
        let today = new Date();
        today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        await dataAccessMutex.runExclusive(async () => {
            await ensureDir(dataDir);
            const dateDirs = await new Promise((resolve, reject) => {
                readdir(dataDir, (err, files) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(files);
                    }
                });
            });
            for (const dateDir of dateDirs) {
                if (new Date(Date.parse(decodeURIComponent(dateDir))) < today) {
                    await remove(dataDir + '/' + dateDir);
                }
            }
        });
        await interaction.editReply('Prior availability removed.');
    }
};
