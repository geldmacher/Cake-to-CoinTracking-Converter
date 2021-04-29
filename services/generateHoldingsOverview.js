const { table } = require('table');
const chalk  = require('chalk');
const Decimal = require('decimal.js');
const { v5: uuidv5 } = require('uuid');

// Stats
const stats = new Map();

// Updates stats
const updateStats = (record, isSell) => {
    // Generate own uuid to identify record groups
    // Unique namespace -> https://www.uuidgenerator.net/
    const currency = isSell ? record['Sell Currency'] : record['Buy Currency'];
    const identifier = uuidv5(currency, '82f84ac6-c3c4-4de5-8d70-a7ce0aacde4f');

    let amount = isSell ? '-' + record['Sell Amount'] : record['Buy Amount'];

    if(stats.has(identifier)){
        const statsRecord = stats.get(identifier);
        const data = [
            currency,
            new Decimal(statsRecord[1]).plus(amount).toString(),
        ];
        stats.set(identifier, data);
    } else {
        const data = [
            currency,
            amount,
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

    // table header
    const header = [
        chalk.dim(chalk.bold('Coin / Asset')),
        chalk.dim(chalk.bold('Amount'))
    ];
    stats.set('header', header);

    // table rows
    records.forEach(record => {

        // Trade
        if(record['Buy Currency'] && record['Sell Currency']){
            updateStats(record, true);
            updateStats(record, false);
        } else {
            updateStats(record, (record['Sell Currency'] ? true : false));
        }
    });

    // table output
    return table(Array.from(stats.values()));
}



module.exports.generateHoldingsOverview = generateHoldingsOverview;