const { table, getBorderCharacters } = require('table');
const chalk  = require('chalk');
const Decimal = require('decimal.js');
const { v5: uuidv5 } = require('uuid');

// Allow extreme small numbers with exponential notation
Decimal.set({
    toExpNeg: -9e15
 });

// Stats
const stats = new Map();

/**
 * Update stats map
 *
 * @param {*} record
 * @param {*} isSell
 */
const updateStats = (record, isSell) => {
    // Generate own uuid to identify record groups
    // Unique namespace -> https://www.uuidgenerator.net/
    const currency = isSell ? record['Sell Currency'] : record['Buy Currency'];
    const identifier = uuidv5(currency, '82f84ac6-c3c4-4de5-8d70-a7ce0aacde4f');
    const amount = isSell ? record['Sell Amount'] : record['Buy Amount'];

    if(stats.has(identifier)){
        const statsRecord = stats.get(identifier);
        const data = [
            currency,
            (isSell ? new Decimal(statsRecord[1]).minus(amount).toString() : new Decimal(statsRecord[1]).plus(amount).toString())
        ];
        stats.set(identifier, data);
    } else {
        const data = [
            currency,
            (isSell ? new Decimal(0).minus(amount).toString() : new Decimal(0).plus(amount).toString())
        ];
        stats.set(identifier, data);
    }
};

/**
 * Generate import result data output
 *
 * @param {*} records
 */
const generateHoldingsOverview = (records) => {

    // Table header
    const header = [
        chalk.dim(chalk.bold('Coin / Asset')),
        chalk.dim(chalk.bold('Amount'))
    ];
    stats.set('header', header);

    // Table rows
    records.forEach(record => {
        // Is trade
        if(record['Buy Currency'] && record['Sell Currency']){
            updateStats(record, true);
            updateStats(record, false);
        } else {
            updateStats(record, (record['Sell Currency'] ? true : false));
        }
    });

    // Table output
    return table(Array.from(stats.values()), {
        border: getBorderCharacters(`norc`),
        columnDefault: {
            width: 30
        },
        columns: {
            0: {
                width: 15
            },
            1: {
                width: 25
            }
          }
    });
}

module.exports.generateHoldingsOverview = generateHoldingsOverview;