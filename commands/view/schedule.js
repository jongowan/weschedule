const { SlashCommandBuilder } = require('discord.js');
const { dateFormatter, get5MinTimes, deepEqual, timeToString } = require('../../shared');
const { readdir } = require('fs/promises');
const { readJson, pathExists } = require('fs-extra');

/**
 * @typedef {Object} AvailableInstance
 * @prop {string} type
 * @prop {number} priority
 * @prop {string} [comment]
 */
/**
 * @typedef {Object} UnknownInstance
 * @prop {string} type
 * @prop {number} likelihood
 * @prop {number} priority
 * @prop {string} [comment]
 */

/**
 * @param {Object<string, AvailableInstance || UnknownInstance>} group
 * @returns {Number}
 */
function computeAvailabilityFactor(group) {
    let factor = 0;
    Object.values(group).forEach(availability => {
        if (availability.type === 'available') factor++;
        if (availability.type === 'unknown') factor += availability.likelihood / 100;
    });
    return factor;
}

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
        await interaction.deferReply();

        const date = new Date(Date.parse(interaction.options.getString('date')));
        const dateStr = encodeURIComponent(dateFormatter.format(date));
        const serverIdStr = encodeURIComponent(interaction.guild.id);
        const serverDirPath = `.data/${dateStr}/${serverIdStr}`;

        const availabilityByUser = {};
        if (await pathExists(serverDirPath)) {
            for (const userStr of await readdir(serverDirPath)) {
                availabilityByUser[decodeURIComponent(userStr)] = await readJson(`${serverDirPath}/${userStr}/availability.json`);
            }
        }

        const serverAvailability = {};
        const times = get5MinTimes(date, new Date(date.getTime() + 24 * 60 * 60 * 1000));
        Object.entries(availabilityByUser).forEach(([userId, availability]) => {
            times.forEach(time => {
                const timeStr = time.toISOString();
                const availabilityDef = availability[timeStr];
                if (availabilityDef !== undefined) {
                    if (!Object.hasOwn(serverAvailability, timeStr)) {
                        serverAvailability[timeStr] = {};
                    }
                    serverAvailability[timeStr][userId] = availabilityDef;
                }
            });
        });

        let serverSpans = [];
        let currentSpan = {
            startTime: times[0],
            stopTime: null,
            availability: serverAvailability[times[0].toISOString()] ?? null,
        };
        [...times, new Date(times[times.length - 1].getTime() + 5 * 60 * 1000)].forEach((time, index) => {
            const availabilityDefByUser = serverAvailability[time.toISOString()] ?? null;
            if (!deepEqual(availabilityDefByUser, currentSpan.availability) || index === times.length) {
                currentSpan.stopTime = time;
                serverSpans.push(currentSpan);
                currentSpan = {
                    startTime: time,
                    stopTime: null,
                    availability: availabilityDefByUser,
                };
            }
        });

        const filteredServerSpans = [];
        for (const span of serverSpans) {
            let countAvailable = 0;
            let countUnknown = 0;
            Object.values(span.availability ?? {}).forEach(availability => {
                if (availability.type === 'available') countAvailable++;
                if (availability.type === 'unknown') countUnknown++;
            });
            if (span.stopTime - span.startTime < (await interaction.options.getNumber('minimum-minutes')) * 60 * 1000) continue;
            if (countAvailable + countUnknown < await interaction.options.getNumber('minimum-availability')) continue;
            filteredServerSpans.push(span);
        }

        filteredServerSpans.sort((a, b) => {
            let availabilityFactorA = computeAvailabilityFactor(a.availability);
            let availabilityFactorB = computeAvailabilityFactor(b.availability);
            if (availabilityFactorA !== availabilityFactorB) {
                return availabilityFactorB - availabilityFactorA;
            }

            let timeLengthDif = (a.stopTime - a.startTime) - (b.stopTime - b.startTime);
            if (timeLengthDif !== 0) return -timeLengthDif;

            let priorityWinsA = 0;
            Object.entries(a.availability).forEach(([userIdA, availabilityA]) => {
                Object.entries(b.availability).forEach(([userIdB, availabilityB]) => {
                    if (userIdA === userIdB) {
                        const priorityA = availabilityA.priority;
                        const priorityB = availabilityB.priority;
                        if (priorityA < priorityB) priorityWinsA--;
                        else if (priorityA > priorityB) priorityWinsA++;
                    }
                });
            });
            return -priorityWinsA;
        });

        const userNames = {};
        async function getUserName(userId) {
            if (userNames[userId] === undefined) {
                userNames[userId] = (await interaction.guild.members.fetch(userId)).displayName;
            }
            return userNames[userId];
        }

        let message = `Availability for ${dateFormatter.format(date)}`;
        for (const span of filteredServerSpans) {
            message += `\n${timeToString(span.startTime)} - ${timeToString(span.stopTime)}:`;
            for (const [userId, availability] of Object.entries(span.availability)) {
                message += `\n\t${await getUserName(userId)} is ${availability.type} with`;
                if (availability.likelihood !== undefined) message += ` likelihood ${availability.likelihood},`;
                message += ` priority ${availability.priority}`;
                if (availability.comment !== undefined) message += `, comment "${availability.comment}"`;
            }
        }
        if (!filteredServerSpans.length) {
            message = `No availability found for ${dateFormatter.format(date)}`;
        }

        await interaction.editReply(message);
    }
};
