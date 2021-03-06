'use strict';
const Err = require('./error.service');

const Valid = {};

Valid.number = (object, name, def, min, max) => {
    const value = object[name] === undefined ? def : object[name];
    if (!Number.isFinite(value)) {
        throw Err(`${name} option is not a valid number; got '${value}'.`);
    }
    if (Number.isFinite(min) && value < min) {
        throw Err(`${name} option must be at least ${min}; got '${value}'.`);
    }
    if (Number.isFinite(max) && value > max) {
        throw Err(`${name} option must be at most ${max}; got '${value}'.`);
    }
    return value;
};

Valid.int = (object, name, def, min, max) => {
    return Math.floor(Valid.number(object, name, def, min, max));
};

Valid.flagArr = (arr, flags) => {
    if (arr === undefined) {
        return [];
    }
    if (!Array.isArray(arr)) {
        throw Err(`"flags" property provided to '.push()' must be an array. Got: '${arr}'.`);
    }
    return arr.map((flagName) => {
        if (!Valid.stringOrSymbol(flagName)) {
            throw Err(`Flag '${flagName}' provided to '.push()' is not a valid flag name. The flag name
                        must be either a String or a Symbol`);
        }
        if (!flags[flagName]) {
            throw Err(`Flag '${flagName}' provided to '.push()' has not been registered with the queue`);
        }
        return flagName;
    });
};

Valid.key = (value, name, def) => {
    if (value === undefined) {
        return def;
    }
    if (!Valid.stringOrSymbol(value)) {
        throw Err(`${name} option must be a valid key (String or Symbol); got '${value}'.`);
    }
    return value;
};

Valid.stringOrSymbol = (val) => {
    return typeof val === 'symbol' || typeof val === 'string' || val instanceof String;
};

module.exports = Valid;
