# Cake to CoinTracking Converter

CLI script to translate [Cake](https://pool.cakedefi.com/#?ref=401824) export data to a valid [CoinTracking](https://cointracking.info?ref=G905622) import.

**IMPORTANT**: Make a backup of your trades before you import new data via this script! \
**EVEN MORE IMPORTANT**: This is no tax advice! The way this script imports data is potentially wrong.

## Features

- Supports german and english CoinTracking import. English is used by default.
- Optional: Uses Cake's FIAT valuation for each transaction in your chosen export currency inestead of the CoinTracking valuation data.

## Installation

[Node.js](https://nodejs.org/) is required to run this script.

Install via npm (Bundled with Node.js):
```shell
npm install cake-to-cointracking-converter
```

## Usage

1. Get your [Cake export CSV](https://app.cakedefi.com/transactions) for all coins and generate a CoinTracking import CSV via this shell command:

2. Run this script via shell: 
```shell 
cake2ct --cake-csv "path\to\cake-export-file.csv" --ct-csv "path\to\cointracking-import-file.csv" --language "DE"
```

3. [Import](https://cointracking.info/import/import_csv/) the generated CoinTracking CSV. Just select your file, check your imports on the next page and import your data if everthing is fine.

## Options

- `--cake-csv` - Path to Cake CSV
- `--ct-csv` - Path to CoinTracking CSV
- `--language` (optional) - Used language for CoinTracking import file. "DE" and "EN" are supported. Default is "EN"
- `--use-cake-fiat-valuation` (optional) - Use the FIAT transaction valuation from Cake CSV import instead of the valuation data from CoinTracking (Keep in mind that your CoinTracking account currency should match your exported transaction valutation currency from Cake)

## Supported Cake operations

- Deposit
- Withdrawal
- Withdrawal fee
- Lending reward
- Lending DFI Bonus
- Staking reward
- Freezer staking bonus
- Unstake fee
- Bonus/Airdrop
- Add liquidity XXX-YYY
- Remove liquidity XXX-YYY
- Added liquidity
- Removed liquidity
- Liquidity mining reward XXX-YYY

---

**Something missing?** Open an [issue](https://github.com/geldmacher/Cake-to-CoinTracking-Converter/issues) or make a PR! ;D