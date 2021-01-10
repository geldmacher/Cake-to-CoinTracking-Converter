const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const stringify = require('csv-stringify');
const cliProgress = require('cli-progress');

const generateCtRecordsFromCakeDataRow = function(row) {

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
        'Date': row['Date'],
        'Tx-ID': row['Reference']
    };

    switch(row['Operation']){
        case 'Deposit':
            data['Type'] = 'Einzahlung';
            data['Buy Currency'] = row['Cryptocurrency'];
            data['Buy Amount'] = row['Amount'];
            break;
        case 'Withdrawal': 
            data['Type'] = 'Auszahlung';
            data['Sell Currency'] = row['Cryptocurrency'];
            data['Sell Amount'] = row['Amount'];
            break;
        case 'Lapis reward':
            data['Type'] = 'Lending Einnahme';
            data['Trade-Group'] = 'Lapis';
            data['Buy Currency'] = row['Cryptocurrency'];
            data['Buy Amount'] = row['Amount'];
            break;
        case 'Lapis DFI Bonus':
            data['Type'] = 'Zinsen';
            data['Trade-Group'] = 'Lapis';
            data['Buy Currency'] = row['Cryptocurrency'];
            data['Buy Amount'] = row['Amount'];
            break;
        case 'Staking reward':
            data['Type'] = 'Staking';
            data['Trade-Group'] = 'Staking';
            data['Buy Currency'] = row['Cryptocurrency'];
            data['Buy Amount'] = row['Amount'];
            break;
        case 'Unstake fee':
            data['Type'] = 'Sonstige Gebühr';
            data['Trade-Group'] = 'Staking';
            data['Sell Currency'] = row['Cryptocurrency'];
            data['Sell Amount'] = row['Amount'] * -1;
            break;
        case 'Bonus/Airdrop':
            data['Type'] = 'Airdrop';
            data['Trade-Group'] = 'Bonus/Airdrop';
            data['Buy Currency'] = row['Cryptocurrency'];
            data['Buy Amount'] = row['Amount'];
            break;
    }

    // Handle "Add liquidity AAA-BBB"
    if(/^Add liquidity [A-Z]{3}-[A-Z]{3}$/.test(row['Operation'])){
        const additionalData = {
            ...data,
            'Type': 'Einzahlung',
            'Trade-Group': 'Liquidity Mining',
            'Buy Currency': row['Cryptocurrency'],
            'Buy Amount': row['Amount'] * -1
        };
        records.push(additionalData);

        data['Type'] = 'Auszahlung';
        data['Trade-Group'] = 'Liquidity Mining';
        data['Sell Currency'] = row['Cryptocurrency'];
        data['Sell Amount'] = row['Amount'] * -1;
    }

    // Handle "Liquidity mining reward AAA-BBB"
    if(/^Liquidity mining reward [A-Z]{3}-[A-Z]{3}$/.test(row['Operation'])){
        data['Type'] = 'Einnahme';
        data['Trade-Group'] = 'Liquidity Mining';
        data['Buy Currency'] = row['Cryptocurrency'];
        data['Buy Amount'] = row['Amount'];
    }

    records.push(data);

    return records;
}

const processCsv = (cakeCsvPath, ctCsvPath) => {
    const cakeCsvFile = path.resolve(cakeCsvPath);
    const ctCsvFile = path.resolve(ctCsvPath);

    const progressBar = new cliProgress.SingleBar({
        format: 'Progress [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
        eof: false
    });

    const cakeCsvStream = fs.createReadStream(cakeCsvFile);

    let records = [];

    progressBar.start(1, 0);

    cakeCsvStream
        .pipe(csv())
        .on('data', row => {
            const transformedRecords = generateCtRecordsFromCakeDataRow(row);
            if(transformedRecords){
                records = [...records, ...transformedRecords];
                progressBar.setTotal(records.length);
                progressBar.updateETA();
                progressBar.increment(transformedRecords.length);
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
                quoted: true
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