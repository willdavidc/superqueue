'use strict';
const Flag = require('./flag.service');

const executeItem = (item, emitter, flags, flagUnlockTimes) => {
    const startTime = Date.now();
    const emission = {
        name: item.name,
        flags: item.flags.slice(1),
        error: false,
    };
    emitter.emit('start', emission);

    item.flags.forEach((flagName) => {
        Flag.updateForExecutionStart(flags[flagName]);
        flagUnlockTimes[flagName] = Flag.findUnlockTime(flags[flagName]);
    });
    item.func(...item.params)
        .then((res) => {
            item.resolve(res);
            emission.result = res;
        })
        .catch((err) => {
            item.reject(err);
            emission.error = true;
            emission.result = err;
        })
        .then(() => {
            item.flags.forEach((flagName) => {
                Flag.updateForExecutionFinish(flags[flagName]);
            });
            emission.duration = Date.now() - startTime;
            emitter.emit('complete', emission);
        });
};

const ExecuteService = {
    queue: ({ queue, flags, defaultFlag, timeout, emitter }) => {
        clearTimeout(timeout.timeout);
        if (!queue.length) {
            return;
        }
        const currentTime = Date.now();
        const flagNames = [...Object.getOwnPropertySymbols(flags), ...Object.getOwnPropertyNames(flags)];

        const flagUnlockTimes = {};
        flagNames.forEach((flagName) => flagUnlockTimes[flagName] = Flag.findUnlockTime(flags[flagName]));

        // Check if default flag is blocked. setTimeout stops working above 2147483647 (~24 days)
        let waitDuration = Math.min(flagUnlockTimes[defaultFlag] - currentTime, 2147483647);
        if (waitDuration > 0) {
            timeout.timeout = setTimeout(this.queue, waitDuration, queue, flags, defaultFlag, timeout, emitter);
            return;
        }
        queue.forEach((queueItem) => {
            const itemReady = queueItem.flags.every((flagName) => {
                return flagUnlockTimes[flagName] <= currentTime;
            });

            if (!itemReady) {
                return;
            }
            queue.splice(queue.indexOf(queueItem), 1);
            executeItem(queueItem, emitter, flags, flagUnlockTimes);
            if (!queue.length) {
                emitter.emit('empty');
                return false;
            }
            if (flagUnlockTimes[defaultFlag] > currentTime) {
                return false;
            }
        });

        // Full list of flags being waited for with no duplicates
        const awaitedFlags = [...new Set([].concat(...queue.map((queueItem) => queueItem.flags)))];

        const findSoonestFlag = (acc, flagName) => Math.min(acc, Flag.findUnlockTime(flags[flagName]));
        waitDuration = awaitedFlags.reduce(findSoonestFlag, Infinity);

        // setTimeout stops working above this (~24 days)
        waitDuration = Math.min(Math.max(waitDuration - currentTime, 0) + 1, 2147483647);
        timeout.timeout = setTimeout(this.queue, waitDuration, queue, flags, defaultFlag, timeout, emitter);
    },
};

module.exports = ExecuteService;