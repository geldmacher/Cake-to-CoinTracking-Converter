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
        income: 'Einnahme',
        expense_non_taxable: 'Ausgabe (steuerfrei)',
        expense: 'Ausgabe'
    },
    en: {
        deposit: 'Deposit',
        withdrawal: 'Withdrawal',
        lending_income: 'Lending Income',
        interest_income: 'Interest Income',
        staking: 'Staking',
        other_fee: 'Other Fee',
        airdrop: 'Airdrop',
        income: 'Income',
        expense_non_taxable: 'Expense (non taxable)',
        expense: 'Expense'
    }
};

/**
 * Translate Cake records to CoinTracking records
 * 
 * @param {*} row 
 * @param {*} lastHandledRecords 
 * @param {*} translatedCtTypes 
 */
const generateCtRecordsFromCakeDataRow = function(row, lastHandledRecords, translatedCtTypes) {

    const records = [];
    const data = {
        'Type': '',
        'Buy Amount': null,
        'Buy Currency': null,
        'Sell Amount': null,
        'Sell Currency': null,
        'Fee': null,
        'Fee Currency': null,
        'Exchange': 'Cake',
        'Trade-Group': '',
        'Comment': row['Operation'],
        'Date': new Date(row['Date']).toISOString(),
        'Tx-ID': row['Reference']
    };

    switch(row['Operation']){
        case 'Deposit':
            data['Type'] = translatedCtTypes.deposit;
            data['Trade-Group'] = 'Deposit';
            data['Buy Currency'] = row['Cryptocurrency'];
            data['Buy Amount'] = row['Amount'];
            break;
        case 'Withdrawal': 
            data['Type'] = translatedCtTypes.withdrawal;
            data['Trade-Group'] = 'Withdrawal';
            data['Sell Currency'] = row['Cryptocurrency'];
            data['Sell Amount'] = row['Amount'].replace('-','');
            break;
        case 'Withdrawal fee':
            data['Type'] = translatedCtTypes.other_fee;
            data['Trade-Group'] = 'Withdrawal';
            data['Sell Currency'] = row['Cryptocurrency'];
            data['Sell Amount'] = row['Amount'].replace('-','');
            break;
        case 'Lapis reward':
            data['Type'] = translatedCtTypes.lending_income;
            data['Trade-Group'] = 'Lapis';
            data['Buy Currency'] = row['Cryptocurrency'];
            data['Buy Amount'] = row['Amount'];
            break;
        case 'Lapis DFI Bonus':
            data['Type'] = translatedCtTypes.interest_income;
            data['Trade-Group'] = 'Lapis';
            data['Buy Currency'] = row['Cryptocurrency'];
            data['Buy Amount'] = row['Amount'];
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
                data['Buy Amount'] = new Decimal(row['Amount']).plus(lastHandledRecords[0]['Buy Amount']).toNumber();
                
            } else {
                data['Buy Amount'] = row['Amount'];
            }
            break;
        case 'Unstake fee':
            data['Type'] = translatedCtTypes.other_fee;
            data['Trade-Group'] = 'Staking';
            data['Sell Currency'] = row['Cryptocurrency'];
            data['Sell Amount'] = row['Amount'].replace('-','');
            break;
        case 'Bonus/Airdrop':
            data['Type'] = translatedCtTypes.airdrop;
            data['Trade-Group'] = 'Bonus/Airdrop';
            data['Buy Currency'] = row['Cryptocurrency'];
            data['Buy Amount'] = row['Amount'];
            break;
        default:
            let notHandledOperation = row['Operation'];
            // Handle "Add liquidity AAA-BBB"
            if(/^Add liquidity [A-Z]{3}-[A-Z]{3}$/.test(row['Operation'])){
                data['Type'] = translatedCtTypes.expense;
                data['Trade-Group'] = 'Liquidity Mining';
                data['Sell Currency'] = row['Cryptocurrency'];
                data['Sell Amount'] = row['Amount'].replace('-','');
                notHandledOperation = null;
            } 
            // Handle "Liquidity mining reward AAA-BBB"
            if(/^Liquidity mining reward [A-Z]{3}-[A-Z]{3}$/.test(row['Operation'])){
                data['Type'] = translatedCtTypes.income;
                data['Trade-Group'] = 'Liquidity Mining';
                data['Buy Currency'] = row['Cryptocurrency'];
                data['Buy Amount'] = row['Amount'];
                notHandledOperation = null;
            }
            // Let us know which operation we are currently not supporting
            if(notHandledOperation){
                console.info('\n' + 'Not able to handle the "' + notHandledOperation + '" operation from Cake atm.');
            }
        break;
    }

    records.push(data);

    return records;
}

/**
 * Process the Cake CSV export and generate the CoinTracking CSV import
 * 
 * @param {*} cakeCsvPath 
 * @param {*} ctCsvPath 
 * @param {*} language 
 */
const processCsv = (cakeCsvPath, ctCsvPath, language) => {

    const translatedCtTypes = (language === 'de' || language === 'en') ? ctType[language] : ctType['en'];

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
        .pipe(csv())
        .on('data', row => {
            lastHandledRecords = generateCtRecordsFromCakeDataRow(row, lastHandledRecords, translatedCtTypes);
            if(lastHandledRecords){
                // Delete last handled records from records
                records = records.filter(record => {
                    if(record['Tx-ID'] === lastHandledRecords[0]['Tx-ID']){
                        return false;
                    } 
                    return true;
                });
                records = [...records, ...lastHandledRecords];
                progressBar.setTotal(records.length);
                progressBar.updateETA();
                progressBar.increment(lastHandledRecords.length);
            } else {
                console.info('\n' + 'No Cake records found');
                progressBar.stop();
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
                    console.error('\n' + error);
                    progressBar.stop();
                } else {
                    fs.writeFile(ctCsvFile, output, error => {
                        if (error) {
                            console.error('\n' + error);
                        } else {
                            console.info('\n' + 'Done! Wrote Cake data to CoinTracking file.');
                        }
                        progressBar.stop();
                    });
                }
            })
        });
};

module.exports.processCsv = processCsv;