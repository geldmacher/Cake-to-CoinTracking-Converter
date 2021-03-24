const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const stringify = require('csv-stringify');
const cliProgress = require('cli-progress');
const { v5: uuidv5 } = require('uuid');
const Decimal = require('decimal.js');

// CoinTracking type fields need to be in the language of your CoinTracking UI
const ctType = {
    de: {
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

// Are there any skipped data rows?
let skippedDataRows = false;

/**
 * Translate Cake records to CoinTracking records
 * 
 * @param {*} row 
 * @param {*} lastHandledRecords 
 * @param {*} translatedCtTypes 
 * @param {*} useCakeFiatValuation 
 * @param {*} noTaxOnLMTransferOperations 
 */
const generateCtRecordsFromCakeDataRow = (row, lastHandledRecords, translatedCtTypes, useCakeFiatValuation, noTaxOnLMTransferOperations) => {

    const records = [];

    try {
        // Cake's CSV export is broken sometimes and exports dara rows without a valid "Operation" field
        if(row['Operation'] === ''){
            skippedDataRows = true;
        } else {
            const data = {
                'Type': null,
                'Buy Amount': null,
                'Buy Currency': null,
                'Sell Amount': null,
                'Sell Currency': null,
                'Fee': null,
                'Fee Currency': null,
                'Exchange': 'Cake',
                'Trade-Group': null,
                'Comment': row['Operation'],
                'Date': new Date(row['Date']).toISOString(),
                'Tx-ID': row['Reference'],
                'Buy Value in your Account Currency': null,
                'Sell Value in your Account Currency': null
            };

            switch(row['Operation']){
                case 'Deposit':
                    data['Type'] = translatedCtTypes.deposit;
                    data['Trade-Group'] = 'Deposit';
                    data['Buy Currency'] = row['Cryptocurrency'];
                    data['Buy Amount'] = row['Amount'].replace('-','');
                    data['Buy Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
                    break;
                case 'Withdrawal': 
                    data['Type'] = translatedCtTypes.withdrawal;
                    data['Trade-Group'] = 'Withdrawal';
                    data['Sell Currency'] = row['Cryptocurrency'];
                    data['Sell Amount'] = row['Amount'].replace('-','');
                    data['Sell Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
                    break;
                case 'Withdrawal fee':
                    data['Type'] = translatedCtTypes.other_fee;
                    data['Trade-Group'] = 'Withdrawal';
                    data['Sell Currency'] = row['Cryptocurrency'];
                    data['Sell Amount'] = row['Amount'].replace('-','');
                    data['Sell Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
                    break;
                case 'Lapis reward':
                case 'Lending reward':
                    data['Type'] = translatedCtTypes.lending_income;
                    data['Trade-Group'] = 'Lending';
                    data['Buy Currency'] = row['Cryptocurrency'];
                    data['Buy Amount'] = row['Amount'].replace('-','');
                    data['Buy Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
                    break;
                case 'Lapis DFI Bonus':
                case 'Lending DFI Bonus':
                    data['Type'] = translatedCtTypes.interest_income;
                    data['Trade-Group'] = 'Lending';
                    data['Buy Currency'] = row['Cryptocurrency'];
                    data['Buy Amount'] = row['Amount'].replace('-','');
                    data['Buy Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
                    break;
                case 'Staking reward':
                    data['Type'] = translatedCtTypes.staking;
                    data['Trade-Group'] = 'Staking';
                    data['Buy Currency'] = row['Cryptocurrency'];
                    // Merge staking data rows by day at 24 o'clock
                    // Otherwise there a way too much of them
                    const date = new Date(row['Date']);
                    const dateAtMidnight = new Date(date.setHours(24,0,0,0)).toISOString();
                    data['Date'] = dateAtMidnight;
                    // Generate own uuid to identify other records from same day
                    // Unique namespace -> https://www.uuidgenerator.net/
                    data['Tx-ID'] = uuidv5((data['Comment'] + '-' + data['Date']), '82f84ac6-c3c4-4de5-8d70-a7ce0aacde4f');
                    if(lastHandledRecords && lastHandledRecords[0] && data['Tx-ID'] === lastHandledRecords[0]['Tx-ID']){
                        data['Buy Amount'] = new Decimal(row['Amount'].replace('-','')).plus(lastHandledRecords[0]['Buy Amount']).toNumber();
                        if(lastHandledRecords[0]['Buy Value in your Account Currency']){
                            data['Buy Value in your Account Currency'] = new Decimal(row['FIAT value'].replace('-','')).plus(lastHandledRecords[0]['Buy Value in your Account Currency']).toNumber();
                        }
                    } else {
                        data['Buy Amount'] = row['Amount'].replace('-','');
                        data['Buy Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
                    }
                    break;
                case 'Freezer staking bonus':
                    data['Type'] = translatedCtTypes.staking;
                    data['Trade-Group'] = 'Staking';
                    data['Buy Currency'] = row['Cryptocurrency'];
                    data['Buy Amount'] = row['Amount'].replace('-','');
                    data['Buy Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
                    break;
                case 'Unstake fee':
                    data['Type'] = translatedCtTypes.other_fee;
                    data['Trade-Group'] = 'Staking';
                    data['Sell Currency'] = row['Cryptocurrency'];
                    data['Sell Amount'] = row['Amount'].replace('-','');
                    data['Sell Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
                    break;
                case 'Bonus/Airdrop':
                    data['Type'] = translatedCtTypes.airdrop;
                    data['Trade-Group'] = 'Bonus/Airdrop';
                    data['Buy Currency'] = row['Cryptocurrency'];
                    data['Buy Amount'] = row['Amount'].replace('-','');
                    data['Buy Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
                    break;
                default:
                    let notHandledOperation = row['Operation'];
                    // Handle "Add liquidity AAA-BBB"
                    if(/^Add liquidity [A-Z]{3}-[A-Z]{3}$/.test(row['Operation'])){
                        data['Type'] = noTaxOnLMTransferOperations ? translatedCtTypes.expense_non_taxable : translatedCtTypes.other_expense;
                        data['Trade-Group'] = 'Liquidity Mining';
                        data['Sell Currency'] = row['Cryptocurrency'];
                        data['Sell Amount'] = row['Amount'].replace('-','');
                        data['Sell Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
                        notHandledOperation = null;
                    } 
                    // Handle "Remove liquidity AAA-BBB"
                    if(/^Remove liquidity [A-Z]{3}-[A-Z]{3}$/.test(row['Operation'])){
                        data['Type'] = noTaxOnLMTransferOperations ? translatedCtTypes.income_non_taxable : translatedCtTypes.other_income;
                        data['Trade-Group'] = 'Liquidity Mining';
                        data['Buy Currency'] = row['Cryptocurrency'];
                        data['Buy Amount'] = row['Amount'].replace('-','');
                        data['Buy Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
                        notHandledOperation = null;
                    } 
                    // Handle "Liquidity mining reward AAA-BBB"
                    if(/^Liquidity mining reward [A-Z]{3}-[A-Z]{3}$/.test(row['Operation'])){
                        data['Type'] = translatedCtTypes.income;
                        data['Trade-Group'] = 'Liquidity Mining';
                        data['Buy Currency'] = row['Cryptocurrency'];
                        data['Buy Amount'] = row['Amount'].replace('-','');
                        data['Buy Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
                        notHandledOperation = null;
                    }
                    // Let us know which operation we are currently not supporting
                    if(notHandledOperation){
                        console.info('\n' + 'Not able to handle Cake\'s "' + notHandledOperation + '" operation atm.');
                    }
                break;
            }
        
            records.push(data);
        }
    } catch(err) {
        console.error('\n' + err);
        process.exit();
    }
    return records;
}

/**
 * Process the Cake CSV export and generate the CoinTracking CSV import
 * 
 * @param {*} cakeCsvPath 
 * @param {*} ctCsvPath 
 * @param {*} language 
 * @param {*} useCakeFiatValuation 
 * @param {*} noTaxOnLMTransferOperations 
 */
const processCsv = (cakeCsvPath, ctCsvPath, language, useCakeFiatValuation, noTaxOnLMTransferOperations) => {

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
    let lastHandledRecords;

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
            lastHandledRecords = generateCtRecordsFromCakeDataRow(row, lastHandledRecords, translatedCtTypes, useCakeFiatValuation, noTaxOnLMTransferOperations);

            if (lastHandledRecords) {
                // Delete last handled records from records
                records = records.filter(record => {
                    if(lastHandledRecords[0] && record['Tx-ID'] === lastHandledRecords[0]['Tx-ID']){
                        return false;
                    } 
                    return true;
                });
                records = [...records, ...lastHandledRecords];
                progressBar.setTotal(records.length);
                progressBar.increment(lastHandledRecords.length);
                progressBar.updateETA();
            } else {
                progressBar.stop();
                console.info('\n' + 'No Cake records found');
            }
        })
        .on('error', error => {
            console.error('\n' + error);
            progressBar.stop();
        })
        .on('end', () => {
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
                                // Any skipped data rows?
                                if(skippedDataRows){
                                    console.info('\n' + 'Some data rows where skipped because the "Operation" field in Cake\'s CSV export was empty.');
                                }
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