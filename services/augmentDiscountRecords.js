const Decimal = require('decimal.js');

// Allow extreme small numbers with exponential notation
Decimal.set({
    toExpNeg: -9e15
});

/**
 * Augment Discount records
 * 
 * @param {*} discountRecords 
 */
const augmentDiscountRecords = (discountRecords) => {

    const sortedDiscountRecords = new Map();
    discountRecords.forEach(discountRecord => {
        if(discountRecord['Related reference ID'].length <= 0){
            sortedDiscountRecords.set(discountRecord['Reference'], {
                '_refs': new Set(),
                ...sortedDiscountRecords.get(discountRecord['Reference']),
                ...discountRecord
            });
        } else {
            if(sortedDiscountRecords.has(discountRecord['Related reference ID'])){
                const sortedDiscountRecord = sortedDiscountRecords.get(discountRecord['Related reference ID']);
                sortedDiscountRecord['_refs'].add(discountRecord);
                sortedDiscountRecords.set(discountRecord['Related reference ID'], sortedDiscountRecord);
            } else {
                sortedDiscountRecords.set(discountRecord['Related reference ID'], {
                    '_refs': new Set([discountRecord]),
                });
            }
        }
    });

    const augmentedDiscountRecords = [];
    sortedDiscountRecords.forEach(sortedDiscountRecord => {
        const augmentedDiscountRecord = {
            'Date': sortedDiscountRecord['Date'],
            'Operation': 'Discount trade',
            'Reference': sortedDiscountRecord['Reference']
        };
        switch(sortedDiscountRecord['Operation']){
            case 'Claimed for 50% discount':
                augmentedDiscountRecord['Buy Amount'] = sortedDiscountRecord['Amount'];
                augmentedDiscountRecord['Buy Coin/Asset'] = sortedDiscountRecord['Coin/Asset'];
                augmentedDiscountRecord['Buy FIAT value'] = sortedDiscountRecord['FIAT value'];
                break;
            case 'Used for 50% discount':
                augmentedDiscountRecord['Sell Amount'] = sortedDiscountRecord['Amount'];
                augmentedDiscountRecord['Sell Coin/Asset'] = sortedDiscountRecord['Coin/Asset'];
                augmentedDiscountRecord['Sell FIAT value'] = sortedDiscountRecord['FIAT value'];
                break;
        }
        sortedDiscountRecord._refs.forEach(sortedDiscountRecordRef => {
            switch(sortedDiscountRecordRef['Operation']){
                case 'Claimed for 50% discount':
                    augmentedDiscountRecord['Buy Amount'] = sortedDiscountRecordRef['Amount'];
                    augmentedDiscountRecord['Buy Coin/Asset'] = sortedDiscountRecordRef['Coin/Asset'];
                    augmentedDiscountRecord['Buy FIAT value'] = sortedDiscountRecordRef['FIAT value'];
                    break;
                case 'Used for 50% discount':
                    augmentedDiscountRecord['Sell Amount'] = sortedDiscountRecordRef['Amount'];
                    augmentedDiscountRecord['Sell Coin/Asset'] = sortedDiscountRecordRef['Coin/Asset'];
                    augmentedDiscountRecord['Sell FIAT value'] = sortedDiscountRecordRef['FIAT value'];
                    break;
            }
        });
        augmentedDiscountRecords.push(augmentedDiscountRecord);
    });

    return augmentedDiscountRecords;
}

module.exports.augmentDiscountRecords = augmentDiscountRecords;