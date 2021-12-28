const Decimal = require('decimal.js');

// Allow extreme small numbers with exponential notation
Decimal.set({
    toExpNeg: -9e15
});

/**
 * Augment DEX Swap records
 * 
 * @param {*} dexSwapRecords 
 */
const augmentDexSwapRecords = (dexSwapRecords) => {

    const sortedDexSwapRecords = new Map();
    dexSwapRecords.forEach(dexSwapRecord => {
        if(sortedDexSwapRecords.has(dexSwapRecord['Related reference ID'])){
            const sortedDexSwapRecord = sortedDexSwapRecords.get(dexSwapRecord['Related reference ID']);
            sortedDexSwapRecord['_refs'].add(dexSwapRecord);
            sortedDexSwapRecords.set(dexSwapRecord['Related reference ID'], sortedDexSwapRecord);
        } else {
            sortedDexSwapRecords.set(dexSwapRecord['Related reference ID'], {
                '_refs': new Set([dexSwapRecord]),
                ...dexSwapRecord
            });
        }
    });
    
    const augmentedDexSwapRecords = [];
    sortedDexSwapRecords.forEach(sortedDexSwapRecord => {
        const augmentedDexSwapRecord = {
            'Date': sortedDexSwapRecord['Date'],
            'Operation': 'Swap trade (DeFiChain DEX)',
            'Reference': sortedDexSwapRecord['Related reference ID']
        };
        sortedDexSwapRecord._refs.forEach(sortedDexSwapRecordRef => {
            switch(sortedDexSwapRecordRef['Operation']){
                case 'Deposit':
                    augmentedDexSwapRecord['Buy Amount'] = sortedDexSwapRecordRef['Amount'];
                    augmentedDexSwapRecord['Buy Coin/Asset'] = sortedDexSwapRecordRef['Coin/Asset'];
                    augmentedDexSwapRecord['Buy FIAT value'] = sortedDexSwapRecordRef['FIAT value'];
                    break;
                case 'Unknown':
                    if(sortedDexSwapRecordRef['Transaction ID']){
                        augmentedDexSwapRecord['Sell Amount'] = sortedDexSwapRecordRef['Amount'];
                        augmentedDexSwapRecord['Sell Coin/Asset'] = sortedDexSwapRecordRef['Coin/Asset'];
                        augmentedDexSwapRecord['Sell FIAT value'] = sortedDexSwapRecordRef['FIAT value'];
                    } else {
                        augmentedDexSwapRecords.push({
                            'Date': sortedDexSwapRecordRef['Date'],
                            'Operation': 'Swap trade fee (DeFiChain DEX)',
                            'Reference': sortedDexSwapRecordRef['Reference'],
                            'Sell Amount': sortedDexSwapRecordRef['Amount'],
                            'Sell Coin/Asset': sortedDexSwapRecordRef['Coin/Asset'],
                            'Sell FIAT value': sortedDexSwapRecordRef['FIAT value']
                        });
                    }
                    break;
            }
        });
        augmentedDexSwapRecords.push(augmentedDexSwapRecord);
    });
    return augmentedDexSwapRecords;
}

module.exports.augmentDexSwapRecords = augmentDexSwapRecords;