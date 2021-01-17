const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const stringify = require('csv-stringify');
const cliProgress = require('cli-progress');
const { v5: uuidv5 } = require('uuid');
const Decimal = require('decimal.js');
const fx = require('money');
const fetch = require('node-fetch')

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
        income: 'Income',
        other_income: 'Other Income',
        expense_non_taxable: 'Expense (non taxable)',
        expense: 'Expense',
        other_expense: 'Other Expense'
    }
};

// Cache conversion rates for minimum API access
const cacheRates = [];

/**
 * Convert currencies
 * @see https://api.exchangeratesapi.io/
 * 
 * @param {*} value 
 * @param {*} from 
 * @param {*} to 
 * @param {*} date 
 */
const convertCurrency = async (value, from, to, date) => {
    // If there is no concrete conversion, let CoinTracking handle the transaction price
    if(!value || !from || !to){
        return null;
    }
    if(from !== to){
        let preparedDate = 'latest';
        if(date){
            const dateObject = new Date(date);
            preparedDate = dateObject.getFullYear() + '-' + ('0' + (dateObject.getMonth() + 1)).slice(-2) + '-' + dateObject.getDate();
        }
        
        let rates = cacheRates[preparedDate] ?? null;
        if(!rates){
            const response = await fetch('https://api.exchangeratesapi.io/' + preparedDate + '?base=USD');
            if (!response.ok) {
                throw('\n' + 'Currency comversion service currently not usable. Try again later or use default currency (USD).');
            }
            const data = await response.json();
            rates = data.rates;
            cacheRates[preparedDate] = rates;
        } 

        fx.rates = rates;
        return fx(value).from(from).to(to);
    } 
    return value;
}

/**
 * Translate Cake records to CoinTracking records
 * 
 * @param {*} row 
 * @param {*} lastHandledRecords 
 * @param {*} translatedCtTypes 
 * @param {*} currency 
 */
const generateCtRecordsFromCakeDataRow = async (row, lastHandledRecords, translatedCtTypes, currency) => {

    const records = [];

    try {
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
                data['Buy Value in your Account Currency'] = await convertCurrency(row['FIAT value'].replace('-',''), row['FIAT currency'], currency, data['Date']);
                break;
            case 'Withdrawal': 
                data['Type'] = translatedCtTypes.withdrawal;
                data['Trade-Group'] = 'Withdrawal';
                data['Sell Currency'] = row['Cryptocurrency'];
                data['Sell Amount'] = row['Amount'].replace('-','');
                data['Sell Value in your Account Currency'] = await convertCurrency(row['FIAT value'].replace('-',''), row['FIAT currency'], currency, data['Date']);
                break;
            case 'Withdrawal fee':
                data['Type'] = translatedCtTypes.other_fee;
                data['Trade-Group'] = 'Withdrawal';
                data['Sell Currency'] = row['Cryptocurrency'];
                data['Sell Amount'] = row['Amount'].replace('-','');
                data['Sell Value in your Account Currency'] = await convertCurrency(row['FIAT value'].replace('-',''), row['FIAT currency'], currency, data['Date']);
                break;
            case 'Lapis reward':
                data['Type'] = translatedCtTypes.lending_income;
                data['Trade-Group'] = 'Lapis';
                data['Buy Currency'] = row['Cryptocurrency'];
                data['Buy Amount'] = row['Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = await convertCurrency(row['FIAT value'].replace('-',''), row['FIAT currency'], currency, data['Date']);
                break;
            case 'Lapis DFI Bonus':
                data['Type'] = translatedCtTypes.interest_income;
                data['Trade-Group'] = 'Lapis';
                data['Buy Currency'] = row['Cryptocurrency'];
                data['Buy Amount'] = row['Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = await convertCurrency(row['FIAT value'].replace('-',''), row['FIAT currency'], currency, data['Date']);
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
                        data['Buy Value in your Account Currency'] = await convertCurrency(data['Buy Value in your Account Currency'], row['FIAT currency'], currency, data['Date']);
                    }
                } else {
                    data['Buy Amount'] = row['Amount'].replace('-','');
                    data['Buy Value in your Account Currency'] = await convertCurrency(row['FIAT value'].replace('-',''), row['FIAT currency'], currency, data['Date']);
                }
                break;
            case 'Unstake fee':
                data['Type'] = translatedCtTypes.other_fee;
                data['Trade-Group'] = 'Staking';
                data['Sell Currency'] = row['Cryptocurrency'];
                data['Sell Amount'] = row['Amount'].replace('-','');
                data['Sell Value in your Account Currency'] = await convertCurrency(row['FIAT value'].replace('-',''), row['FIAT currency'], currency, data['Date']);
                break;
            case 'Bonus/Airdrop':
                data['Type'] = translatedCtTypes.airdrop;
                data['Trade-Group'] = 'Bonus/Airdrop';
                data['Buy Currency'] = row['Cryptocurrency'];
                data['Buy Amount'] = row['Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = await convertCurrency(row['FIAT value'].replace('-',''), row['FIAT currency'], currency, data['Date']);
                break;
            default:
                let notHandledOperation = row['Operation'];
                // Handle "Add liquidity AAA-BBB"
                if(/^Add liquidity [A-Z]{3}-[A-Z]{3}$/.test(row['Operation'])){
                    data['Type'] = translatedCtTypes.other_expense;
                    data['Trade-Group'] = 'Liquidity Mining';
                    data['Sell Currency'] = row['Cryptocurrency'];
                    data['Sell Amount'] = row['Amount'].replace('-','');
                    data['Sell Value in your Account Currency'] = await convertCurrency(row['FIAT value'].replace('-',''), row['FIAT currency'], currency, data['Date']);
                    notHandledOperation = null;
                } 
                // Handle "Remove liquidity AAA-BBB"
                if(/^Remove liquidity [A-Z]{3}-[A-Z]{3}$/.test(row['Operation'])){
                    data['Type'] = translatedCtTypes.other_income;
                    data['Trade-Group'] = 'Liquidity Mining';
                    data['Buy Currency'] = row['Cryptocurrency'];
                    data['Buy Amount'] = row['Amount'].replace('-','');
                    data['Buy Value in your Account Currency'] = await convertCurrency(row['FIAT value'].replace('-',''), row['FIAT currency'], currency, data['Date']);
                    notHandledOperation = null;
                } 
                // Handle "Liquidity mining reward AAA-BBB"
                if(/^Liquidity mining reward [A-Z]{3}-[A-Z]{3}$/.test(row['Operation'])){
                    data['Type'] = translatedCtTypes.income;
                    data['Trade-Group'] = 'Liquidity Mining';
                    data['Buy Currency'] = row['Cryptocurrency'];
                    data['Buy Amount'] = row['Amount'].replace('-','');
                    data['Buy Value in your Account Currency'] = await convertCurrency(row['FIAT value'].replace('-',''), row['FIAT currency'], currency, data['Date']);
                    notHandledOperation = null;
                }
                // Let us know which operation we are currently not supporting
                if(notHandledOperation){
                    console.info('\n' + 'Not able to handle the Cake\'s "' + notHandledOperation + '" operation atm.');
                }
            break;
        }
    
        records.push(data);
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
 * @param {*} currency 
 */
const processCsv = async (cakeCsvPath, ctCsvPath, language, currency) => {

    // EN is the default language
    const normalizedLanguage = (language) ? language.toLowerCase() : 'en';
    // only "de" and "en" are supported atm
    const translatedCtTypes = (normalizedLanguage === 'de' || normalizedLanguage === 'en') ? ctType[language] : ctType['en'];

    let convertToCurrency = null;
    if(currency){
        convertToCurrency = currency.toUpperCase();
    }

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
            console.error('\n' + error);
            progressBar.stop();
        })
        .pipe(csv())
        .on('error', error => {
            console.error('\n' + error);
            progressBar.stop();
        })
        .on('data', async row => {
            lastHandledRecords = await generateCtRecordsFromCakeDataRow(row, lastHandledRecords, translatedCtTypes, convertToCurrency);
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
                    if(output){
                        fs.writeFile(ctCsvFile, output, error => {
                            if (error) {
                                console.error('\n' + error);
                            } else {
                                console.info('\n' + 'Done! Wrote Cake data to CoinTracking file.');
                            }
                            progressBar.stop();
                        });
                    } else {
                        console.error('\n' + 'Could not write CoinTracking file.');
                    }
                }
            })
        })
        .on('error', error => {
            console.error('\n' + error);
            progressBar.stop();
        });
};

module.exports.processCsv = processCsv;