const { table } = require('table');
const chalk  = require('chalk');
const Decimal = require('decimal.js');
const { v5: uuidv5 } = require('uuid');

/**
 * Generate import result data output
 * 
 * @param {*} records 
 */
const generateImportResultOutput = (records) => {
     
    // Output stats as table
    const stats = new Map();
    
    // table header
    stats.set('header', [
        chalk.dim(chalk.bold('Type')), // Row name
        chalk.dim(chalk.bold(chalk.green('Buy Amount'))), // Buy Amount
        chalk.dim(chalk.bold(chalk.red('Sell Amount'))), // Sell Amount
        chalk.dim(chalk.bold(chalk.red('Fee'))), // Fee
        chalk.dim(chalk.bold(chalk.green('Buy Value in your Account Currency'))), // Buy Value in your Account Currency
        chalk.dim(chalk.bold(chalk.red('Sell Value in your Account Currency'))) // Sell Value in your Account Currency
    ]);

    // table rows
    records.forEach(record => {
        // Generate own uuid to identify record groups
        // Unique namespace -> https://www.uuidgenerator.net/
        const identifier = uuidv5((record['Type'] + '-' + record['Trade-Group'] + '-' + record['Comment'] + '-' + record['Buy Currency'] + '-' + record['Sell Currency'] + '-' + record['Fee Currency']), '82f84ac6-c3c4-4de5-8d70-a7ce0aacde4f');
        if(stats.has(identifier)){
            const statsRecord = stats.get(identifier);
            stats.set(identifier, [
                statsRecord[0],
                (record['Buy Amount'] && statsRecord[1]) ? new Decimal(record['Buy Amount']).plus(statsRecord[1]).toNumber() : '',
                (record['Sell Amount'] && statsRecord[2]) ? new Decimal(record['Sell Amount']).plus(statsRecord[2]).toNumber() : '',
                (record['Fee'] && statsRecord[3]) ? new Decimal(record['Fee']).plus(statsRecord[3]).toNumber() : '',
                (record['Buy Value in your Account Currency'] && statsRecord[4]) ? new Decimal(record['Buy Value in your Account Currency']).plus(statsRecord[4]).toNumber() : '',
                (record['Sell Value in your Account Currency'] && statsRecord[5]) ? new Decimal(record['Sell Value in your Account Currency']).plus(statsRecord[5]).toNumber() : ''
            ]);
        } else {
            stats.set(identifier, [
                record['Type'] + ' - ' + record['Comment'] + ' [' + (record['Buy Currency'] + record['Sell Currency'] + record['Fee Currency']) + ']',
                record['Buy Amount'],
                record['Sell Amount'],
                record['Fee'],
                record['Buy Value in your Account Currency'],
                record['Sell Value in your Account Currency']
            ]);
        }
    });

    // table output
    return table(Array.from(stats.values()));
}

module.exports.generateImportResultOutput = generateImportResultOutput;