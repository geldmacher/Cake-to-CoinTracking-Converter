const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const stringify = require('csv-stringify');
const cliProgress = require('cli-progress');
const Decimal = require('decimal.js');

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
 * Translate Cake records to CoinTracking records
 * 
 * @param {*} row  
 * @param {*} translatedCtTypes 
 * @param {*} useCakeFiatValuation  
 */
const generateCtRecordsFromCakeDataRow = (row, translatedCtTypes, useCakeFiatValuation) => {

    const records = [];
    const skippedRecords = [];
    const lmRecords = [];

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
            case 'Liquidity mining pool trade':
                data['Type'] = translatedCtTypes.trade;
                data['Trade-Group'] = 'Liquidity Mining';
                data['Buy Currency'] = row['Buy Coin/Asset'];
                data['Buy Amount'] = row['Buy Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCakeFiatValuation ? row['Buy FIAT value'].replace('-','') : null;
                data['Sell Currency'] = row['Sell Coin/Asset'];
                data['Sell Amount'] = row['Sell Amount'].replace('-','');
                data['Sell Value in your Account Currency'] = useCakeFiatValuation ? row['Sell FIAT value'].replace('-','') : null;
                break;
            case 'Deposit':
                data['Type'] = translatedCtTypes.deposit;
                data['Trade-Group'] = 'Deposit';
                data['Buy Currency'] = row['Coin/Asset'];
                data['Buy Amount'] = row['Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
                break;
            case 'Withdrawal': 
                data['Type'] = translatedCtTypes.withdrawal;
                data['Trade-Group'] = 'Withdrawal';
                data['Sell Currency'] = row['Coin/Asset'];
                data['Sell Amount'] = row['Amount'].replace('-','');
                data['Sell Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
                break;
            case 'Withdrawal fee':
                data['Type'] = translatedCtTypes.other_fee;
                data['Trade-Group'] = 'Withdrawal';
                data['Sell Currency'] = row['Coin/Asset'];
                data['Sell Amount'] = row['Amount'].replace('-','');
                data['Sell Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
                break;
            case 'Lapis reward':
            case 'Lending reward':
                data['Type'] = translatedCtTypes.lending_income;
                data['Trade-Group'] = 'Lending';
                data['Buy Currency'] = row['Coin/Asset'];
                data['Buy Amount'] = row['Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
                break;
            case 'Lapis DFI Bonus':
            case 'Lending DFI Bonus':
                data['Type'] = translatedCtTypes.interest_income;
                data['Trade-Group'] = 'Lending';
                data['Buy Currency'] = row['Coin/Asset'];
                data['Buy Amount'] = row['Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
                break;
            case 'Staking reward':
                data['Type'] = translatedCtTypes.staking;
                data['Trade-Group'] = 'Staking';
                data['Buy Currency'] = row['Coin/Asset'];
                data['Buy Amount'] = row['Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
            case 'Freezer staking bonus':
                data['Type'] = translatedCtTypes.staking;
                data['Trade-Group'] = 'Staking';
                data['Buy Currency'] = row['Coin/Asset'];
                data['Buy Amount'] = row['Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
                break;
            case 'Unstake fee':
                data['Type'] = translatedCtTypes.other_fee;
                data['Trade-Group'] = 'Staking';
                data['Sell Currency'] = row['Coin/Asset'];
                data['Sell Amount'] = row['Amount'].replace('-','');
                data['Sell Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
                break;
            case 'Bonus/Airdrop':
                data['Type'] = translatedCtTypes.airdrop;
                data['Trade-Group'] = 'Bonus/Airdrop';
                data['Buy Currency'] = row['Coin/Asset'];
                data['Buy Amount'] = row['Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
                break;
            default:
                let notHandledOperation = row['Operation'];
                // Preserve LM related rows which are related to each other and transfer their data to another handling mechanism
                if(
                    row['Operation'] === 'Added liquidity' 
                    || row['Operation'] === 'Removed liquidity' 
                    || /^Add liquidity [A-Z]{3}-[A-Z]{3}$/.test(row['Operation']) 
                    || /^Remove liquidity [A-Z]{3}-[A-Z]{3}$/.test(row['Operation'])
                ){
                    lmRecords.push(row);
                    notHandledOperation = null;
                }
                // Handle "Liquidity mining reward AAA-BBB"
                if(/^Liquidity mining reward [A-Z]{3}-[A-Z]{3}$/.test(row['Operation'])){
                    data['Type'] = translatedCtTypes.income;
                    data['Trade-Group'] = 'Liquidity Mining';
                    data['Buy Currency'] = row['Coin/Asset'];
                    data['Buy Amount'] = row['Amount'].replace('-','');
                    data['Buy Value in your Account Currency'] = useCakeFiatValuation ? row['FIAT value'].replace('-','') : null;
                    notHandledOperation = null;
                }
                // Log operations which are currently not supported
                if(notHandledOperation){
                    skippedRecords.push(row);
                    console.info('\n' + 'Not able to handle Cake\'s "' + notHandledOperation + '" operation atm.');
                }
            break;
        }

        if(data['Type'] && data['Type'].length > 0){
            records.push(data);
        }
    } catch(err) {
        skippedRecords.push(row);
        console.error('\n' + err);
        process.exit();
    }
    return [records, skippedRecords, lmRecords];
}

/**
 * Process the Cake CSV export and generate the CoinTracking CSV import
 * 
 * @param {*} cakeCsvPath 
 * @param {*} ctCsvPath 
 * @param {*} language 
 * @param {*} useCakeFiatValuation 
 */
const processCsv = (cakeCsvPath, ctCsvPath, language, useCakeFiatValuation) => {

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
            handledRecords = generateCtRecordsFromCakeDataRow(row, translatedCtTypes, useCakeFiatValuation);
            progressBar.setTotal(records.length + skippedRecords.length + lmRecords.length);
            // Normal records
            if (handledRecords[0].length > 0) {
                records = [...records, ...handledRecords[0]];
                progressBar.increment(handledRecords[0].length);
                progressBar.updateETA();
            } 
            // Skipped records
            if (handledRecords[1].length > 0) {
                skippedRecords = [...skippedRecords, ...handledRecords[1]];
                progressBar.increment(handledRecords[1].length);
                progressBar.updateETA();
            }
            // LM records
            if (handledRecords[2].length > 0) {
                lmRecords = [...lmRecords, ...handledRecords[2]];
                progressBar.increment(handledRecords[2].length);
                progressBar.updateETA();
            }
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
            // Handle LM records
            if(lmRecords.length > 0){
                const sortedLmRecords = new Map();
                lmRecords.forEach(lmRecord => {
                    if(lmRecord['Related reference ID'].length <= 0){
                        sortedLmRecords.set(lmRecord['Reference'], {
                            '_refs': new Set(),
                            ...sortedLmRecords.get(lmRecord['Reference']),
                            ...lmRecord
                        });
                    } else {
                        if(sortedLmRecords.has(lmRecord['Related reference ID'])){
                            const sortedLmRecord = sortedLmRecords.get(lmRecord['Related reference ID']);
                            sortedLmRecord['_refs'].add(lmRecord);
                            sortedLmRecords.set(lmRecord['Related reference ID'], sortedLmRecord);
                        } else {
                            sortedLmRecords.set(lmRecord['Related reference ID'], {
                                '_refs': new Set([lmRecord]),
                            });
                        }
                    }
                });
                
                const augmentedLmRecords = [];
                sortedLmRecords.forEach(sortedLmRecord => {
                    sortedLmRecord._refs.forEach(sortedLmRecordRef => {
                        const augmentedLmRecord = {
                            'Date': sortedLmRecord['Date'],
                            'Operation': 'Liquidity mining pool trade'
                        };
    
                        switch(sortedLmRecord['Operation']){
                            case 'Added liquidity':
                                augmentedLmRecord['Reference'] = sortedLmRecordRef['Reference'];
                                augmentedLmRecord['Buy Amount'] = new Decimal(sortedLmRecord['Amount']).dividedBy(2).toString();
                                augmentedLmRecord['Buy Coin/Asset'] = sortedLmRecord['Coin/Asset'];
                                augmentedLmRecord['Buy FIAT value'] = sortedLmRecordRef['FIAT value'];
                                augmentedLmRecord['Sell Amount'] = sortedLmRecordRef['Amount'];
                                augmentedLmRecord['Sell Coin/Asset'] = sortedLmRecordRef['Coin/Asset'];
                                augmentedLmRecord['Sell FIAT value'] = sortedLmRecordRef['FIAT value'];
                                break;
                            case 'Removed liquidity':
                                augmentedLmRecord['Reference'] = sortedLmRecordRef['Reference'];
                                augmentedLmRecord['Buy Amount'] = sortedLmRecordRef['Amount'];
                                augmentedLmRecord['Buy Coin/Asset'] = sortedLmRecordRef['Coin/Asset'];
                                augmentedLmRecord['Buy FIAT value'] = sortedLmRecordRef['FIAT value'];
                                augmentedLmRecord['Sell Amount'] = new Decimal(sortedLmRecord['Amount']).dividedBy(2).toString();
                                augmentedLmRecord['Sell Coin/Asset'] = sortedLmRecord['Coin/Asset'];
                                augmentedLmRecord['Sell FIAT value'] = sortedLmRecordRef['FIAT value'];
                                break;
                        }
                        augmentedLmRecords.push(augmentedLmRecord);
                    });
                });

                augmentedLmRecords.forEach(augmentedLmRecord => {
                    handledRecords = generateCtRecordsFromCakeDataRow(augmentedLmRecord, translatedCtTypes, useCakeFiatValuation);
                    if (handledRecords[0].length > 0) {
                        records = [...records, ...handledRecords[0]];
                    } 
                });
            }
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