const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const stringify = require('csv-stringify');
const cliProgress = require('cli-progress');

const { consolidateData } = require('./services/consolidateData');
const { augmentLmRecords } = require('./services/augmentLmRecords');
const { generateCtRecordsFromCakeDataRow } = require('./services/generateCtRecordsFromCakeDataRow');
const { generateImportResultOutput } = require('./services/generateImportResultOutput');

// CoinTracking type fields need to be in the language of your CoinTracking UI
const ctType = {
    de: {
        trade: 'Trade',
        deposit: 'Einzahlung',
        withdrawal: 'Auszahlung',
        lending_income: 'Lending Einnahme',
        interest_income: 'Zinsen',
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
 */
const processCsv = (cakeCsvPath, ctCsvPath, language, useCtFiatValuation, consolidateStakingData) => {

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

    progressBar.start(1, 0);

    cakeCsvStream
        .on('error', error => {
            progressBar.stop();
            console.error('\n' + error);
        })
        .pipe(csv())
        .on('error', error => {
            progressBar.stop();
            console.error('\n' + error);
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

            progressBar.setTotal(records.length + skippedRecords.length + lmRecords.length);
            progressBar.updateETA();
        })
        .on('error', error => {
            console.error('\n' + error);
            progressBar.stop();
        })
        .on('end', () => {

            // Any skipped records?
            if(skippedRecords.length > 0){
                console.info('\n' + 'Some data rows where skipped.');
            }

            // Consolidate staking data rows by day at midnight
            if(consolidateStakingData && records.length > 0){
                records = consolidateData(records);
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

            // Output import stats
            const statsOutput = generateImportResultOutput(records);

            // Build CoinTracking CSV file
            stringify(records, {
                header: true,
                quoted: true,
                eof: false
            }, (error, output) => {
                if (error) {
                    progressBar.stop();
                    console.error('\n' + error);
                } else {
                    if(output){
                        fs.writeFile(ctCsvFile, output, error => {
                            progressBar.stop();
                            if (error) {
                                console.error('\n' + error);
                            } else {
                                console.log('\n' + statsOutput);
                                console.info('\n' + 'Done! Wrote Cake data to CoinTracking file.');
                            }
                        });
                    } else {
                        progressBar.stop();
                        console.error('\n' + 'Could not write CoinTracking file.');
                    }
                }
            })
        })
        .on('error', error => {
            progressBar.stop();
            console.error('\n' + error);
        });
};

module.exports.processCsv = processCsv;