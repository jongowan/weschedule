const { Mutex } = require('async-mutex');

/**
 * @param {Object} obj1
 * @param {Object} obj2
 * @returns {boolean}
 */
function deepEqual(obj1, obj2) {
    if (obj1 === obj2) return true;
    if (obj1 === null || obj2 === null) return false;
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    return keys1.every(key => {
        if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
            return deepEqual(obj1[key], obj2[key]);
        }
        return obj1[key] === obj2[key];
    });
}

/**
 * @param {Date} startTime
 * @param {Date} stopTime
 * @returns {Date[]}
 */
function get5MinTimes(startTime, stopTime) {
    const times = [];

    let current = new Date(
        startTime.getFullYear(), startTime.getMonth(), startTime.getDate(),
        startTime.getHours(), Math.ceil(startTime.getMinutes() / 5) * 5
    );
    do {
        times.push(current);
        current = new Date(current.getTime() + 5 * 60 * 1000);
    } while (current < stopTime);

    return times;
}

/**
 * @param {Date} time
 * @returns {string}
 */
function timeToString(time) {
    return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const dateFormatter = Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

module.exports = {
    dataAccessMutex: new Mutex(),
    get5MinTimes: get5MinTimes,
    dateFormatter: dateFormatter,
    deepEqual: deepEqual,
    timeToString: timeToString
};
