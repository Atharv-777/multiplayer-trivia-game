const _ = require("lodash")

function getRandomElement(arr) {
    if (!arr || arr.length === 0) return undefined
    return arr[_.random(0, arr.length - 1)]
}

function getUrl(type, specifics) {
    let path = process.env.BASE_ADDR
    switch (type) {
        case "QUESTION":
            path = `${path}/${specifics}`
            break
        default:
            console.error("No case matched for type : " + type)
            break
    }

    return path
}

module.exports = { getRandomElement, getUrl }