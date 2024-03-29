const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const stringify = require('csv-stringify');
const cliProgress = require('cli-progress');
const chalk = require('chalk');

const { consolidateData } = require('./services/consolidateData');
const { augmentLmRecords } = require('./services/augmentLmRecords');
const { augmentSwapRecords } = require('./services/augmentSwapRecords');
const { augmentDexSwapRecords } = require('./services/augmentDexSwapRecords');
const { augmentDiscountRecords } = require('./services/augmentDiscountRecords');
const { generateCtRecordsFromCakeDataRow } = require('./services/generateCtRecordsFromCakeDataRow');
const { generateHoldingsOverview } = require('./services/generateHoldingsOverview');
const { generateErrorDetailsOverview } = require('./services/generateErrorDetailsOverview');
const { generateIncomeOverview } = require('./services/generateIncomeOverview');

// CoinTracking type fields need to be in the language of your CoinTracking UI
const ctType = {
    de: {
        trade: 'Trade',
        deposit: 'Einzahlung',
        withdrawal: 'Auszahlung',
        lending_income: 'Lending Einnahme',
        interest_income: 'Zinsen',
        reward_income: 'Belohnung / Bonus',
        staking: 'Staking',
        other_fee: 'Sonstige Gebühr',
        airdrop: 'Airdrop',
        income_non_taxable: 'Einnahme (steuerfrei)',
        income: 'Einnahme',
        other_income: 'Sonstige Einnahme',
        expense_non_taxable: 'Ausgabe (steuerfrei)',
        expense: 'Ausgabe',
        other_expense: 'Sonstige Ausgabe'
    },
    en: {
        trade: 'Trade',
        deposit: 'Deposit',
        withdrawal: 'Withdrawal',
        lending_income: 'Lending Income',
        interest_income: 'Interest Income',
        reward_income: 'Reward / Bonus',
        staking: 'Staking',
        other_fee: 'Other Fee',
        airdrop: 'Airdrop',
        income_non_taxable: 'Income (non taxable)',
        income: 'Income',
        other_income: 'Other Income',
        expense_non_taxable: 'Expense (non taxable)',
        expense: 'Expense',
        other_expense: 'Other Expense'
    }
};

/**
 * Process the Cake CSV export and generate the CoinTracking CSV import
 *
 * @param {*} cakeCsvPath
 * @param {*} ctCsvPath
 * @param {*} language
 * @param {*} useCtFiatValuation
 * @param {*} consolidateStakingData
 * @param {*} displayHoldingsOverview
 * @param {*} displayIncomeOverview
 */
const processCsv = (cakeCsvPath, ctCsvPath, language, useCtFiatValuation, consolidateStakingData, displayHoldingsOverview, displayIncomeOverview) => {

    // EN is the default language
    const normalizedLanguage = (language.length > 0) ? language.toLowerCase() : 'en';
    // only "de" and "en" are supported atm
    const translatedCtTypes = (normalizedLanguage === 'de' || normalizedLanguage === 'en') ? ctType[normalizedLanguage] : ctType['en'];

    const cakeCsvFile = path.resolve(cakeCsvPath);
    const ctCsvFile = path.resolve(ctCsvPath);

    const progressBar = new cliProgress.SingleBar({
        format: 'Progress [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    });

    const cakeCsvStream = fs.createReadStream(cakeCsvFile);

    let records = [];
    let skippedRecords = [];
    let lmRecords = [];
    let swapRecords = [];
    let discountRecords = [];
    let dexSwapRecords = [];

    progressBar.start(1, 0);

    cakeCsvStream
        .on('error', error => {
            progressBar.stop();
            console.error('\n' + chalk.bold(chalk.red(error)) + '\n');
        })
        .pipe(csv())
        .on('error', error => {
            progressBar.stop();
            console.error('\n' + chalk.bold(chalk.red(error)) + '\n');
        })
        .on('data', row => {
            handledRecords = generateCtRecordsFromCakeDataRow(row, translatedCtTypes, useCtFiatValuation);

            // Normal records
            if (handledRecords[0].length > 0) {
                records = [...records, ...handledRecords[0]];
                progressBar.increment(handledRecords[0].length);
            }
            // Skipped records
            if (handledRecords[1].length > 0) {
                skippedRecords = [...skippedRecords, ...handledRecords[1]];
                progressBar.increment(handledRecords[1].length);
            }
            // LM records
            if (handledRecords[2].length > 0) {
                lmRecords = [...lmRecords, ...handledRecords[2]];
                progressBar.increment(handledRecords[2].length);
            }
            // Swap records
            if (handledRecords[3].length > 0) {
                swapRecords = [...swapRecords, ...handledRecords[3]];
                progressBar.increment(handledRecords[3].length);
            }
            // Discount records
            if (handledRecords[4].length > 0) {
                discountRecords = [...discountRecords, ...handledRecords[4]];
                progressBar.increment(handledRecords[4].length);
            }
            // DEX swap records
            if (handledRecords[5].length > 0) {
                dexSwapRecords = [...dexSwapRecords, ...handledRecords[5]];
                progressBar.increment(handledRecords[5].length);
            }

            progressBar.setTotal(records.length + skippedRecords.length + lmRecords.length + swapRecords.length + discountRecords.length + dexSwapRecords.length);
            progressBar.updateETA();
        })
        .on('error', error => {
            console.error('\n' + chalk.bold(chalk.red(error)) + '\n');
            progressBar.stop();
        })
        .on('end', () => {

            // Consolidate staking data rows by day at midnight
            if(consolidateStakingData && records.length > 0){
                records = consolidateData(records, translatedCtTypes, useCtFiatValuation);
            }

            // Handle Swap records
            if(swapRecords.length > 0){
                const augmentedSwapRecords = augmentSwapRecords(swapRecords);
                augmentedSwapRecords.forEach(augmentedSwapRecord => {
                    handledRecords = generateCtRecordsFromCakeDataRow(augmentedSwapRecord, translatedCtTypes, useCtFiatValuation);
                    if (handledRecords[0].length > 0) {
                        records = [...records, ...handledRecords[0]];
                    }
                });
            }

            // Handle DEX Swap records
            if(dexSwapRecords.length > 0){
                const augmentedDexSwapRecords = augmentDexSwapRecords(dexSwapRecords);
                augmentedDexSwapRecords.forEach(augmentedDexSwapRecord => {
                    handledRecords = generateCtRecordsFromCakeDataRow(augmentedDexSwapRecord, translatedCtTypes, useCtFiatValuation);
                    if (handledRecords[0].length > 0) {
                        records = [...records, ...handledRecords[0]];
                    }
                });
            }

            // Handle Discount records
            if(discountRecords.length > 0){
                const augmentedDiscountRecords = augmentDiscountRecords(discountRecords);
                augmentedDiscountRecords.forEach(augmentedDiscountRecord => {
                    handledRecords = generateCtRecordsFromCakeDataRow(augmentedDiscountRecord, translatedCtTypes, useCtFiatValuation);
                    if (handledRecords[0].length > 0) {
                        records = [...records, ...handledRecords[0]];
                    }
                });
            }

            // Handle LM records
            if(lmRecords.length > 0){
                const augmentedLmRecords = augmentLmRecords(lmRecords);
                augmentedLmRecords.forEach(augmentedLmRecord => {
                    handledRecords = generateCtRecordsFromCakeDataRow(augmentedLmRecord, translatedCtTypes, useCtFiatValuation);
                    if (handledRecords[0].length > 0) {
                        records = [...records, ...handledRecords[0]];
                    }
                });
            }

            // Output holdings
            let holdings;
            if(displayHoldingsOverview){
                holdings = generateHoldingsOverview(records);
            }

            // Output income
            let income;
            if(displayIncomeOverview){
                income = generateIncomeOverview(records);
            }

            // Build CoinTracking CSV file
            stringify(records, {
                header: true,
                quoted: true,
                eof: false
            }, (error, output) => {
                if (error) {
                    progressBar.stop();
                    console.error('\n' + chalk.bold(chalk.red(error)) + '\n');
                } else {
                    if(output){
                        fs.writeFile(ctCsvFile, output, error => {
                            progressBar.stop();
                            if (error) {
                                console.error('\n' + chalk.bold(chalk.red(error)) + '\n');
                            } else {
                                console.info('\n' + chalk.bold(chalk.green('Done! Wrote Cake data to CoinTracking file.')));
                                if(displayIncomeOverview){
                                    console.info('\n' + chalk.underline(chalk.bold('Your monthly income at Cake:')));
                                    console.log('\n' + income + '\n');
                                }
                                if(displayHoldingsOverview){
                                    console.info('\n' + chalk.underline(chalk.bold('Your current holdings at Cake:')));
                                    console.log('\n' + holdings + '\n');
                                }

                                // Any skipped records?
                                if(skippedRecords.length > 0){
                                    console.info(chalk.underline(chalk.bold(chalk.yellow('Some data rows where skipped:'))));
                                    const skippedRowsErrorsDetailsOutput = generateErrorDetailsOverview(skippedRecords);
                                    console.log('\n' + skippedRowsErrorsDetailsOutput + '\n');
                                }
                            }
                        });
                    } else {
                        progressBar.stop();
                        console.error('\n' + chalk.bold(chalk.red('Could not write CoinTracking file.')) + '\n');
                    }
                }
            })
        })
        .on('error', error => {
            progressBar.stop();
            console.error('\n' + chalk.bold(chalk.red(error)) + '\n');
        });
};

module.exports.processCsv = processCsv;