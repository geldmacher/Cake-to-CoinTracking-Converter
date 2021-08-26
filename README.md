# Cake to CoinTracking Converter

CLI script to translate [Cake](https://app.cakedefi.com/#?ref=401824) export data to a valid [CoinTracking](https://cointracking.info?ref=G905622) import.

**IMPORTANT**: Make a backup of your trades before you import new data via this script! \
**EVEN MORE IMPORTANT**: This is no tax advice! The way this script imports data might be wrong.

## Features

- **Supports german and english CoinTracking import** \
English is used by default.
- **Displays simple overview of current holdings at cake** \
The overview is displayed in the shell after script execution. You need the export data of your complete Cake usage time. Otherwise this overview is nonsense.
- **Uses Cake's FIAT valuation for each transaction in your chosen export currency instead of the CoinTracking valuation data** \
Keep in mind that your CoinTracking account currency should match your exported transaction valutation currency from Cake.
This feature can be disabled via `--use-cointracking-fiat-valuation`. The CoinTracking data is than used.
- **Generates trades for Liquidity Mining, Swap and "50% Discount" operations** \
In case of Liquidity mining operations this script generates trades from the used assets (eg BTC and DFI) to their corresponding pool tokens (eg BTC-DFI) and vice versa. Even the correct FIAT valuation for the pool tokens is transmitted to CoinTracking.
- **Consolidate data from staking operations on a daily basis at midnight** (**EXPERIMENTAL**) \
This can drastically reduce the import amount of data rows for CoinTracking.
You can switch this on via  `--consolidate-staking-data`.

> **IMPORTANT**: The consolidation feature is experimental. Please check your CoinTracking import carefully (and make a backup) and let me know if something is wrong. You cannot switch between the normal mode of this script and this consolidation mode, because the consolidation mode is generating its own Tx-ID's to identify the imported data rows. The only clean solution for switching between these modes would be to delete the complete data set from CoinTracking and reimport if afterwards. Another caveat of the consolidation mode is, that you need to import Cake's data for "complete days". Otherwise some staking data would be lost, because the consolidation mode consolidates all staking data for each day and defines a new Tx-ID for each day. After this a day is "completed" and no further data is added to CoinTracking for this day.

## Installation

1) [Node.js](https://nodejs.org/) is required to run this script. Just download and install the current LTS version.
2) Install it with your shell via npm (Bundled with Node.js):

```shell
npm install -g cake-to-cointracking-converter
```

## Usage

1. Get your [Cake export CSV](https://app.cakedefi.com/transactions) for all coins and generate a CoinTracking import CSV via this shell command:

2. Run this script via shell: 
```shell 
cake2ct --cake-csv "path\to\cake-export-file.csv" --ct-csv "path\to\cointracking-import-file.csv" --language "DE"
```

3. [Import](https://cointracking.info/import/import_csv/) the generated CoinTracking CSV. Just select your file, check your imports on the next page and import your data if everthing is fine.

## Options

- `--cake-csv` - Path to Cake CSV.
- `--ct-csv` - Path to CoinTracking CSV. Creates one, if it is not existing.
- `--language` (optional) - Used language for CoinTracking import file. "DE" and "EN" are supported. Default is "EN".
- `--display-holdings-overview` (optional) - Displays simple overview of current holdings at cake. You need the export data of your complete Cake usage time. Otherwise this overview is nonsense.
- `--consolidate-staking-data` (optional) - Consolidate data from staking operations on a daily basis at midnight.
- `--use-cointracking-fiat-valuation` (optional) - Use the FIAT transaction valuation from CoinTracking instead of the valuation data from Cake.
- `--no-auto-stake-rewards` (optional) - Stakable rewards are signed as normal incomes. By default they are signed as staking income.

## Supported Cake operations

- Deposit
- Withdrawal
- Withdrawal fee
- Referral reward
- Referral signup bonus
- Lending reward
- Lending DFI Bonus
- Confectionery Lending DFI Bonus
- Staking reward
- Freezer promotion bonus
- Freezer staking bonus
- Freezer liquidity mining bonus
- Unstake fee
- Bonus/Airdrop
- Add liquidity XXX-YYY
- Remove liquidity XXX-YYY
- Added liquidity
- Removed liquidity
- Liquidity mining reward XXX-YYY
- Swapped in
- Swapped out
- Claimed for 50% discount
- Used for 50% discount

## Sponsor me

I made it a lot more easy for you to manage your Cake data with CoinTracking? Show me some love! ;D

Your options: \
:heart: [**GitHub** Sponsors](https://github.com/sponsors/geldmacher) \
:heart: DeFiChain (**DFI**) Address: `dXuDCyiH82qL5wQ7eNmQVmfM68fgntrPy1` \
:heart: Bitcoin (**BTC**) Address: `bc1q04z9xnuf9adac042k44q9v0j4ur7exkr5tp85t` \
:heart: Ethereum (**ETH**) Address: `0xAb1c000a139B18a5B3F48cDA0e9eeF57eF842902`

---

**Something missing?** Open an [issue](https://github.com/geldmacher/Cake-to-CoinTracking-Converter/issues) or make a PR! ;D
