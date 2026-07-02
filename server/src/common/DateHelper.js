/**
 * Returns today's date in YYYY-MM-DD format based on UTC.
 */
function getTodayDate() {
    let date = new Date()
    let year = date.getFullYear()
    let month = date.getMonth() + 1
    let day = date.getDate()
    month = month < 10 ? `0${month}` : month
    day = day < 10 ? `0${day}` : day
    let todaysDate = `${year}-${month}-${day}`
    return todaysDate
}

/**
 * Checks if two dates (in YYYY-MM-DD format or Date objects) are equal.
 */
function isDateEqual(date1, date2) {
    let d1 = new Date(date1)
    let d2 = new Date(date2)
    return d1.toDateString() == d2.toDateString()
}

/**
 * Checks if the first date is strictly greater than the second date.
 */
function isDateGreater(date1, date2) {
    const d1 = new Date(date1).getTime();
    const d2 = new Date(date2).getTime();
    return d1 > d2;
}

/**
 * Returns yesterday's date in YYYY-MM-DD format based on a given date.
 */
function getYesterdayDate(inputDate) {
    let date = inputDate ? new Date(inputDate) : new Date();
    date.setDate(date.getDate() - 1);
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    month = month < 10 ? `0${month}` : month;
    day = day < 10 ? `0${day}` : day;
    return `${year}-${month}-${day}`;
}

module.exports = {
    getTodayDate,
    isDateEqual,
    isDateGreater,
    getYesterdayDate
};