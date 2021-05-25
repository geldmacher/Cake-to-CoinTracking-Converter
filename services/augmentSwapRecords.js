const Decimal = require('decimal.js');

// Allow extreme small numbers with exponential notation
Decimal.set({
    toExpNeg: -9e15
});

/**
 * Augment Swap records
 * 
 * @param {*} swapRecords 
 */
const augmentSwapRecords = (swapRecords) => {

    const sortedSwapRecords = new Map();
    swapRecords.forEach(swapRecord => {
        if(sortedSwapRecords.has(swapRecord['Related reference ID'])){
            const sortedSwapRecord = sortedSwapRecords.get(swapRecord['Related reference ID']);
            sortedSwapRecord['_refs'].add(swapRecord);
            sortedSwapRecords.set(swapRecord['Related reference ID'], sortedSwapRecord);
        } else {
            sortedSwapRecords.set(swapRecord['Related reference ID'], {
                '_refs': new Set([swapRecord]),
                ...swapRecord
            });
        }
    });
    
    const augmentedSwapRecords = [];
    sortedSwapRecords.forEach(sortedSwapRecord => {
        const augmentedSwapRecord = {
            'Date': sortedSwapRecord['Date'],
            'Operation': 'Swap trade',
            'Reference': sortedSwapRecord['Related reference ID']
        };
        sortedSwapRecord._refs.forEach(sortedSwapRecordRef => {
            switch(sortedSwapRecordRef['Operation']){
                case 'Swapped in':
                    augmentedSwapRecord['Buy Amount'] = sortedSwapRecordRef['Amount'];
                    augmentedSwapRecord['Buy Coin/Asset'] = sortedSwapRecordRef['Coin/Asset'];
                    augmentedSwapRecord['Buy FIAT value'] = sortedSwapRecordRef['FIAT value'];
                    break;
                case 'Swapped out':
                    augmentedSwapRecord['Sell Amount'] = sortedSwapRecordRef['Amount'];
                    augmentedSwapRecord['Sell Coin/Asset'] = sortedSwapRecordRef['Coin/Asset'];
                    augmentedSwapRecord['Sell FIAT value'] = sortedSwapRecordRef['FIAT value'];
                    break;
            }
        });
        augmentedSwapRecords.push(augmentedSwapRecord);
    });

    return augmentedSwapRecords;
}

module.exports.augmentSwapRecords = augmentSwapRecords;