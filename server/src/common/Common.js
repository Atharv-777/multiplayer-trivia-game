const _ = require("lodash")

function getRandomElement(arr) {
    if (!arr || arr.length === 0) return undefined
    return arr[_.random(0, arr.length - 1)]
}

module.exports = { getRandomElement }