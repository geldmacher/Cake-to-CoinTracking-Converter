const Decimal = require('decimal.js');

/**
 * Augment LM records
 * 
 * @param {*} lmRecords 
 */
const augmentLmRecords = (lmRecords) => {
     
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

    return augmentedLmRecords;
}

module.exports.augmentLmRecords = augmentLmRecords;