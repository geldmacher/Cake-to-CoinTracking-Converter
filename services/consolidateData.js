const Decimal = require('decimal.js');
const { v5: uuidv5 } = require('uuid');

/**
 * Consolidate data rows
 * 
 * @param {*} records 
 * @param {*} translatedCtTypes 
 * @param {*} useCtFiatValuation 
 */
const consolidateData = (records, translatedCtTypes, useCtFiatValuation) => {
     
    const consolidatedRecords = new Map();

    records.forEach(record => {
        if(record['Type'] === translatedCtTypes.staking){
            const date = new Date(record['Date']);
            const dateAtMidnight = new Date(date.setHours(24,0,0,0)).toISOString();
            const stakingRecord = record;
            stakingRecord['Date'] = dateAtMidnight;
            stakingRecord['Comment'] = record['Comment'] + ' (Consolidated)';
            // Generate own uuid to identify other records from same day
            // Unique namespace -> https://www.uuidgenerator.net/
            stakingRecord['Tx-ID'] = uuidv5((stakingRecord['Comment'] + '-' + stakingRecord['Date'] + '-' + stakingRecord['Buy Currency']), '82f84ac6-c3c4-4de5-8d70-a7ce0aacde4f');
            if(consolidatedRecords.has(stakingRecord['Tx-ID'])){
                const consolidatedRecord = consolidatedRecords.get(stakingRecord['Tx-ID']);
                stakingRecord['Buy Amount'] = new Decimal(record['Buy Amount']).plus(consolidatedRecord['Buy Amount']).toNumber();
                if(!useCtFiatValuation){
                    stakingRecord['Buy Value in your Account Currency'] = new Decimal(record['Buy Value in your Account Currency']).plus(consolidatedRecord['Buy Value in your Account Currency']).toNumber();
                }
                consolidatedRecords.set(stakingRecord['Tx-ID'], stakingRecord);
            } else { 
                consolidatedRecords.set(stakingRecord['Tx-ID'], stakingRecord);
            }
            // Remove original record from records
            records = records.filter(originalRecord => originalRecord['Tx-ID'] !== record['Tx-ID']);
        }
    });

    return [...records, ...consolidatedRecords.values()];
}

module.exports.consolidateData = consolidateData;