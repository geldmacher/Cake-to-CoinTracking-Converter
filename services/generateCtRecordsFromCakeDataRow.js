const Decimal = require('decimal.js');

// Allow extreme small numbers with exponential notation
Decimal.set({
    toExpNeg: -9e15
});

/**
 * Translate Cake records to CoinTracking records
 * 
 * @param {*} row  
 * @param {*} translatedCtTypes 
 * @param {*} useCtFiatValuation  
 * @param {*} noAutoStakeRewards  
 */
const generateCtRecordsFromCakeDataRow = (row, translatedCtTypes, useCtFiatValuation, noAutoStakeRewards) => {

    const records = [];
    const skippedRecords = [];
    const lmRecords = [];
    const swapRecords = [];
    const discountRecords = [];

    try {
        const data = {
            'Type': '',
            'Buy Amount': '',
            'Buy Currency': '',
            'Sell Amount': '',
            'Sell Currency': '',
            'Fee': '',
            'Fee Currency': '',
            'Exchange': 'Cake',
            'Trade-Group': '',
            'Comment': row['Operation'],
            'Date': new Date(row['Date']).toISOString(),
            'Tx-ID': row['Reference'],
            'Ref-ID': row['Related reference ID'],
            'Buy Value in your Account Currency': '',
            'Sell Value in your Account Currency': ''
        };

        switch(row['Operation']){
            case 'Liquidity mining pool trade': // Custom operation (@see ./augmentLmRecords.js)
                data['Type'] = translatedCtTypes.trade;
                data['Trade-Group'] = 'Liquidity Mining';
                data['Buy Currency'] = row['Buy Coin/Asset'];
                data['Buy Amount'] = row['Buy Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCtFiatValuation ? row['Buy FIAT value'].replace('-','') : '';
                data['Sell Currency'] = row['Sell Coin/Asset'];
                data['Sell Amount'] = row['Sell Amount'].replace('-','');
                data['Sell Value in your Account Currency'] = useCtFiatValuation ? row['Sell FIAT value'].replace('-','') : '';
                break;
            case 'Freezer liquidity mining bonus':
                data['Type'] = (row['Coin/Asset'] === 'DFI' && !noAutoStakeRewards) ? translatedCtTypes.staking : translatedCtTypes.income;
                data['Trade-Group'] = 'Liquidity Mining';
                data['Buy Currency'] = row['Coin/Asset'];
                data['Buy Amount'] = row['Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCtFiatValuation ? '' : row['FIAT value'].replace('-','');
                break;
            case 'Swap trade': // Custom operation (@see ./augmentSwapRecords.js)
                data['Type'] = translatedCtTypes.trade;
                data['Trade-Group'] = 'Swap';
                data['Buy Currency'] = row['Buy Coin/Asset'];
                data['Buy Amount'] = row['Buy Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCtFiatValuation ? row['Buy FIAT value'].replace('-','') : '';
                data['Sell Currency'] = row['Sell Coin/Asset'];
                data['Sell Amount'] = row['Sell Amount'].replace('-','');
                data['Sell Value in your Account Currency'] = useCtFiatValuation ? row['Sell FIAT value'].replace('-','') : '';
                break;
            case 'Discount trade': // Custom operation (@see ./augmentDiscountRecords.js)
                data['Type'] = translatedCtTypes.trade;
                data['Trade-Group'] = 'Discount';
                data['Buy Currency'] = row['Buy Coin/Asset'];
                data['Buy Amount'] = row['Buy Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCtFiatValuation ? row['Buy FIAT value'].replace('-','') : '';
                data['Sell Currency'] = row['Sell Coin/Asset'];
                data['Sell Amount'] = row['Sell Amount'].replace('-','');
                data['Sell Value in your Account Currency'] = useCtFiatValuation ? row['Sell FIAT value'].replace('-','') : '';
                break;    
            case 'Deposit':
                // Deposit operations with a reference ID are handled via DefiChain DEX and not fully integrated in the Cake export data
                // Swap withdrawel and paid swap fee are marked as "unknown" operation
                if(data['Ref-ID'] && data['Ref-ID'].length > 0){
                    row['_error'] = 'DefiChain DEX operations (like Swaps) are not traversable right now, because some related data is incomplete in the Cake export (Swap withdrawel and paid swap fee are marked as "unknown" operation). See this issue: https://github.com/geldmacher/Cake-to-CoinTracking-Converter/issues/10';
                    skippedRecords.push(row);
                }
                data['Type'] = translatedCtTypes.deposit;
                data['Trade-Group'] = 'Deposit';
                data['Buy Currency'] = row['Coin/Asset'];
                data['Buy Amount'] = row['Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCtFiatValuation ? '' : row['FIAT value'].replace('-','');
                break;
            case 'Withdrawal': 
                data['Type'] = translatedCtTypes.withdrawal;
                data['Trade-Group'] = 'Withdrawal';
                data['Sell Currency'] = row['Coin/Asset'];
                data['Sell Amount'] = row['Amount'].replace('-','');
                data['Sell Value in your Account Currency'] = useCtFiatValuation ? '' : row['FIAT value'].replace('-','');
                break;
            case 'Withdrawal fee':
                data['Type'] = translatedCtTypes.other_fee;
                data['Trade-Group'] = 'Withdrawal';
                data['Sell Currency'] = row['Coin/Asset'];
                data['Sell Amount'] = row['Amount'].replace('-','');
                data['Sell Value in your Account Currency'] = useCtFiatValuation ? '' : row['FIAT value'].replace('-','');
                break;
            case 'Lapis reward':
            case 'Lending reward':
                data['Type'] = translatedCtTypes.lending_income;
                data['Trade-Group'] = 'Lending';
                data['Buy Currency'] = row['Coin/Asset'];
                data['Buy Amount'] = row['Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCtFiatValuation ? '' : row['FIAT value'].replace('-','');
                break;
            case 'Lapis DFI Bonus':
            case 'Lending DFI Bonus':
            case 'Confectionery Lending DFI Bonus':
                data['Type'] = translatedCtTypes.interest_income;
                data['Trade-Group'] = 'Lending';
                data['Buy Currency'] = row['Coin/Asset'];
                data['Buy Amount'] = row['Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCtFiatValuation ? '' : row['FIAT value'].replace('-','');
                break;
            case 'Staking reward':
            case '5 years freezer reward':
            case '10 years freezer reward':
                data['Type'] = translatedCtTypes.staking;
                data['Trade-Group'] = 'Staking';
                data['Buy Currency'] = row['Coin/Asset'];
                data['Buy Amount'] = row['Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCtFiatValuation ? '' : row['FIAT value'].replace('-','');
                break;
            case 'Staking reward':
                data['Type'] = translatedCtTypes.staking;
                data['Trade-Group'] = 'Staking';
                data['Buy Currency'] = row['Coin/Asset'];
                data['Buy Amount'] = row['Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCtFiatValuation ? '' : row['FIAT value'].replace('-','');
                break;
            case 'Freezer staking bonus':
            case 'Freezer promotion bonus':
                data['Type'] = translatedCtTypes.staking;
                data['Trade-Group'] = 'Staking';
                data['Buy Currency'] = row['Coin/Asset'];
                data['Buy Amount'] = row['Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCtFiatValuation ? '' : row['FIAT value'].replace('-','');
                break;
            case 'Unstake fee':
                data['Type'] = translatedCtTypes.other_fee;
                data['Trade-Group'] = 'Staking';
                data['Sell Currency'] = row['Coin/Asset'];
                data['Sell Amount'] = row['Amount'].replace('-','');
                data['Sell Value in your Account Currency'] = useCtFiatValuation ? '' : row['FIAT value'].replace('-','');
                break;
            case 'Bonus/Airdrop':
                data['Type'] = translatedCtTypes.airdrop;
                data['Trade-Group'] = 'Bonus/Airdrop';
                data['Buy Currency'] = row['Coin/Asset'];
                data['Buy Amount'] = row['Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCtFiatValuation ? '' : row['FIAT value'].replace('-','');
                break;
            case 'Referral reward':
            case 'Referral signup bonus':
            case 'Signup bonus':
            case 'Promotion bonus':
                data['Type'] = translatedCtTypes.income;
                data['Trade-Group'] = 'Referral';
                data['Buy Currency'] = row['Coin/Asset'];
                data['Buy Amount'] = row['Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCtFiatValuation ? '' : row['FIAT value'].replace('-','');
                break;        
            default:
                let notHandledOperation = row['Operation'];
                // Preserve LM related rows which are related to each other and transfer their data to another handling mechanism
                if(
                    row['Operation'] === 'Added liquidity' 
                    || row['Operation'] === 'Removed liquidity' 
                    || /^Add liquidity [A-Z]{3,4}-[A-Z]{3}$/.test(row['Operation']) 
                    || /^Remove liquidity [A-Z]{3,4}-[A-Z]{3}$/.test(row['Operation'])
                ){
                    lmRecords.push(row);
                    notHandledOperation = '';
                }
                // Preserve swap related rows which are related to each other and transfer their data to another handling mechanism
                if(row['Operation'] === 'Swapped in' || row['Operation'] === 'Swapped out'){
                    swapRecords.push(row);
                    notHandledOperation = '';
                }
                // Preserve discount related rows which are related to each other and transfer their data to another handling mechanism
                if(row['Operation'] === 'Claimed for 50% discount' || row['Operation'] === 'Used for 50% discount'){
                    discountRecords.push(row);
                    notHandledOperation = '';
                }
                // Handle "Liquidity mining reward AAA(A)-BBB"
                if(/^Liquidity mining reward [A-Z]{3,4}-[A-Z]{3}$/.test(row['Operation'])){
                    data['Type'] = (row['Coin/Asset'] === 'DFI' && !noAutoStakeRewards) ? translatedCtTypes.staking : translatedCtTypes.income;
                    data['Trade-Group'] = 'Liquidity Mining';
                    data['Buy Currency'] = row['Coin/Asset'];
                    data['Buy Amount'] = row['Amount'].replace('-','');
                    data['Buy Value in your Account Currency'] = useCtFiatValuation ? '' : row['FIAT value'].replace('-','');
                    notHandledOperation = '';
                }
                // Log operations which are currently not supported
                if(notHandledOperation){
                    row['_error'] = 'Not able to handle Cake\'s "' + notHandledOperation + '" operation atm. Post an issue or make a PR: https://github.com/geldmacher/Cake-to-CoinTracking-Converter';
                    skippedRecords.push(row);
                }
            break;
        }

        if(data['Type'] && data['Type'].length > 0){
            records.push(data);
        }
    } catch(error) {
        row['_error'] = error;
        skippedRecords.push(row);
    }
    
    return [records, skippedRecords, lmRecords, swapRecords, discountRecords];
}

module.exports.generateCtRecordsFromCakeDataRow = generateCtRecordsFromCakeDataRow;