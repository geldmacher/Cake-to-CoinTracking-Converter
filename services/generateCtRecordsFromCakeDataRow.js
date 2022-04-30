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
 */
const generateCtRecordsFromCakeDataRow = (row, translatedCtTypes, useCtFiatValuation) => {

    const records = [];
    const skippedRecords = [];
    const lmRecords = [];
    const swapRecords = [];
    const discountRecords = [];
    const dexSwapRecords = [];

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
            'Buy Value in your Account Currency': '',
            'Sell Value in your Account Currency': ''
        };

        switch(row['Operation']){
            case 'Liquidity mining pool trade': // Custom operation (@see ./augmentLmRecords.js)
                data['Type'] = translatedCtTypes.trade;
                data['Trade-Group'] = 'Liquidity Mining';
                data['Buy Currency'] = row['Buy Coin/Asset'];
                data['Buy Amount'] = row['Buy Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCtFiatValuation ? '' : row['Buy FIAT value'].replace('-','');
                data['Sell Currency'] = row['Sell Coin/Asset'];
                data['Sell Amount'] = row['Sell Amount'].replace('-','');
                data['Sell Value in your Account Currency'] = useCtFiatValuation ? '' : row['Sell FIAT value'].replace('-','');
                break;
            case 'Freezer liquidity mining bonus':
                data['Type'] = translatedCtTypes.income;
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
                data['Buy Value in your Account Currency'] = useCtFiatValuation ? '' : row['Buy FIAT value'].replace('-','');
                data['Sell Currency'] = row['Sell Coin/Asset'];
                data['Sell Amount'] = row['Sell Amount'].replace('-','');
                data['Sell Value in your Account Currency'] = useCtFiatValuation ? '' : row['Sell FIAT value'].replace('-','');
                break;
            case 'Swap trade (DeFiChain DEX)': // Custom operation (@see ./augmentDexSwapRecords.js)
                data['Type'] = translatedCtTypes.trade;
                data['Trade-Group'] = 'Swap';
                data['Buy Currency'] = row['Buy Coin/Asset'];
                data['Buy Amount'] = row['Buy Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCtFiatValuation ? '' : row['Buy FIAT value'].replace('-','');
                data['Sell Currency'] = row['Sell Coin/Asset'];
                data['Sell Amount'] = row['Sell Amount'].replace('-','');
                data['Sell Value in your Account Currency'] = useCtFiatValuation ? '' : row['Sell FIAT value'].replace('-','');
                break;
            case 'Swap trade fee (DeFiChain DEX)': // Custom operation (@see ./augmentDexSwapRecords.js)
                data['Type'] = translatedCtTypes.other_fee;
                data['Trade-Group'] = 'Swap';
                data['Sell Currency'] = row['Sell Coin/Asset'];
                data['Sell Amount'] = row['Sell Amount'].replace('-','');
                data['Sell Value in your Account Currency'] = useCtFiatValuation ? '' : row['Sell FIAT value'].replace('-','');
                break;
            case 'Discount trade': // Custom operation (@see ./augmentDiscountRecords.js)
                data['Type'] = translatedCtTypes.trade;
                data['Trade-Group'] = 'Discount';
                data['Buy Currency'] = row['Buy Coin/Asset'];
                data['Buy Amount'] = row['Buy Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCtFiatValuation ? '' : row['Buy FIAT value'].replace('-','');
                data['Sell Currency'] = row['Sell Coin/Asset'];
                data['Sell Amount'] = row['Sell Amount'].replace('-','');
                data['Sell Value in your Account Currency'] = useCtFiatValuation ? '' : row['Sell FIAT value'].replace('-','');
                break;
            case 'Deposit':
                // Deposit operations with a reference ID are handled via DeFiChain DEX
                // Swap withdrawel and paid swap fee are part of this operation. See "Withdrew for swap" and "Paid swap fee".
                if(row['Related reference ID'] && row['Related reference ID'].length > 0){
                    dexSwapRecords.push(row);
                } else {
                    data['Type'] = translatedCtTypes.deposit;
                    data['Trade-Group'] = 'Deposit';
                    data['Buy Currency'] = row['Coin/Asset'];
                    data['Buy Amount'] = row['Amount'].replace('-','');
                    data['Buy Value in your Account Currency'] = useCtFiatValuation ? '' : row['FIAT value'].replace('-','');
                }
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
            case 'Lapis DFI Bonus':
            case 'Lending DFI Bonus':
            case 'Entry staking wallet: Lending DFI Bonus':
            case 'Confectionery Lending DFI Bonus':
                data['Type'] = translatedCtTypes.lending_income;
                data['Trade-Group'] = 'Lending';
                data['Buy Currency'] = row['Coin/Asset'];
                data['Buy Amount'] = row['Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCtFiatValuation ? '' : row['FIAT value'].replace('-','');
                break;
            case 'Staking reward':
            case '5 years freezer reward':
            case '10 years freezer reward':
            case 'Freezer staking bonus':
                data['Type'] = translatedCtTypes.staking;
                data['Trade-Group'] = 'Staking';
                data['Buy Currency'] = row['Coin/Asset'];
                data['Buy Amount'] = row['Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCtFiatValuation ? '' : row['FIAT value'].replace('-','');
                break;
            case 'Unstake fee':
            case 'Exit staking wallet fee':
                data['Type'] = translatedCtTypes.other_fee;
                data['Trade-Group'] = 'Staking';
                data['Sell Currency'] = row['Coin/Asset'];
                data['Sell Amount'] = row['Amount'].replace('-','');
                data['Sell Value in your Account Currency'] = useCtFiatValuation ? '' : row['FIAT value'].replace('-','');
                break;
            case 'Bonus/Airdrop':
            case 'Entry staking wallet: Bonus/Airdrop':
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
            case 'Entry staking wallet: Referral signup bonus':
            case 'Entry staking wallet: Signup bonus':
            case 'Entry staking wallet: Promotion bonus':
            case 'Freezer promotion bonus':
            case 'Entry staking wallet: Freezer promotion bonus':
                data['Type'] = translatedCtTypes.income;
                data['Trade-Group'] = 'Referral';
                data['Buy Currency'] = row['Coin/Asset'];
                data['Buy Amount'] = row['Amount'].replace('-','');
                data['Buy Value in your Account Currency'] = useCtFiatValuation ? '' : row['FIAT value'].replace('-','');
                break;
            default:
                let notHandledOperation = row['Operation'];
                // Temprary exclude this operations from handling
                // It seems like this operation 'Entry staking wallet' is the negativ counterpart to all staking related income operations
                // 'Exit staking wallet' is triggred when coins are unstaked
                // This might be usefull for a tax related "virtual" separation of staking and non-staking wallets
                if (row['Operation'] === 'Entry staking wallet' || row['Operation'] === 'Exit staking wallet') {
                    notHandledOperation = '';
                }
                // Preserve LM related rows which are related to each other and transfer their data to another handling mechanism
                if(
                    row['Operation'] === 'Added liquidity'
                    || row['Operation'] === 'Removed liquidity'
                    || /^Add liquidity (?:d)?[A-Z]+-[A-Z]{3,4}$/.test(row['Operation'])
                    || /^Remove liquidity (?:d)?[A-Z]+-[A-Z]{3,4}$/.test(row['Operation'])
                ){
                    lmRecords.push(row);
                    notHandledOperation = '';
                }
                // Preserve swap related rows which are related to each other and transfer their data to another handling mechanism
                if(row['Operation'] === 'Swapped in' || row['Operation'] === 'Swapped out'){
                    swapRecords.push(row);
                    notHandledOperation = '';
                }
                // Preserve DEX swap related rows which are related to each other and transfer their data to another handling mechanism
                // Atm DEX swap operations consists out of 3 seperate operations
                // One is marked as a normal Deposit, the other 2 are "Withdrew for swap" and "Paid swap fee"
                if (row['Operation'] === 'Withdrew for swap' || row['Operation'] === 'Paid swap fee') {
                    dexSwapRecords.push(row);
                    notHandledOperation = '';
                }
                // Preserve discount related rows which are related to each other and transfer their data to another handling mechanism
                if(row['Operation'] === 'Claimed for 50% discount' || row['Operation'] === 'Used for 50% discount'){
                    discountRecords.push(row);
                    notHandledOperation = '';
                }
                // Handle "Liquidity mining reward (d)A+-BBB(B)"
                if(/^Liquidity mining reward (?:d)?[A-Z]+-[A-Z]{3,4}$/.test(row['Operation'])){
                    data['Type'] = translatedCtTypes.income;
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

    return [records, skippedRecords, lmRecords, swapRecords, discountRecords, dexSwapRecords];
}

module.exports.generateCtRecordsFromCakeDataRow = generateCtRecordsFromCakeDataRow;