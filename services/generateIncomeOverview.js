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
 */
const updateStats = (record) => {
    // Generate own uuid to identify record groups
    // Unique namespace -> https://www.uuidgenerator.net/
    const currency = record['Buy Currency'];
    const year = new Date(record['Date']).getUTCFullYear().toString();
    const month = new Date(record['Date']).getUTCMonth() + 1;
    const identifier = uuidv5(currency + '_' + year + '_' + month, '82f84ac6-c3c4-4de5-8d70-a7ce0aacde4f');
    const amount = record['Buy Amount'];
    const amountAccountCurrency = record['Buy Value in your Account Currency'];

    let hasProducedIncome = false;
    switch(record['Comment']){
        case 'Freezer liquidity mining bonus':
        case 'Lapis reward':
        case 'Lending reward':
        case 'Lapis DFI Bonus':
        case 'Lending DFI Bonus':
        case 'Confectionery Lending DFI Bonus':
        case 'Staking reward':
        case '5 years freezer reward':
        case '10 years freezer reward':
        case 'Freezer staking bonus':
        case 'Freezer promotion bonus':
        case 'Bonus/Airdrop':
        case 'Referral reward':
        case 'Referral signup bonus':
        case 'Signup bonus':
        case 'Promotion bonus':
        case 'Entry staking wallet: Signup bonus':
        case 'Entry staking wallet: Promotion bonus':
        case 'Entry staking wallet: Referral signup bonus':
        case 'Entry staking wallet: Bonus/Airdrop':
        case 'Entry staking wallet: Freezer promotion bonus':
        case 'Entry staking wallet: Lending DFI Bonus':
            hasProducedIncome = true;
        break;
        default:
            // Handle "Liquidity mining reward (d)A+-BBB(B)"
            if(/^Liquidity mining reward (?:d)?[A-Z]+-[A-Z]{3,4}$/.test(record['Comment'])){
                hasProducedIncome = true;
            }
        break;
    }

    if(hasProducedIncome){
        if(stats.has(identifier)){
            const statsRecord = stats.get(identifier);
            const data = [
                year,
                month,
                currency,
                new Decimal(statsRecord[3]).plus(amount).toString(),
                new Decimal(statsRecord[4]).plus(amountAccountCurrency).toString()
            ];
            stats.set(identifier, data);
        } else {
            const data = [
                year,
                month,
                currency,
                new Decimal(0).plus(amount).toString(),
                new Decimal(0).plus(amountAccountCurrency).toString()
            ];
            stats.set(identifier, data);
        }
    }
};

/**
 * Generate monthly income overview output
 *
 * @param {*} records
 */
const generateIncomeOverview = (records) => {

    // Table header
    const header = [
        chalk.dim(chalk.bold('Year')),
        chalk.dim(chalk.bold('Month')),
        chalk.dim(chalk.bold('Coin / Asset')),
        chalk.dim(chalk.bold('Amount')),
        chalk.dim(chalk.bold('Value in Account Currency'))
    ];
    stats.set('header', header);

    // Table rows
    records.forEach(record => {
        updateStats(record);
    });

    // Table output
    return table(Array.from(stats.values()), {
        border: getBorderCharacters(`norc`),
        columnDefault: {
            width: 30
        },
        columns: {
            0: {
                width: 5
            },
            1: {
                width: 5
            },
            2: {
                width: 15
            },
            3: {
                width: 25
            },
            43: {
                width: 35
            }
          }
    });
}

module.exports.generateIncomeOverview = generateIncomeOverview;