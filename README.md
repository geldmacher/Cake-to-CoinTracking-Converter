# Cake to CoinTracking Converter

CLI script to translate [Cake](https://pool.cakedefi.com/#?ref=401824) export data to a valid [CoinTracking](https://cointracking.info?ref=G905622) import.

**IMPORTANT**: Make a backup of your trades before you import new data via this script! \
**EVEN MORE IMPORTANT**: This is no tax advice! The way this script imports data is potentially wrong.

> **Liquidity Mining** \
> At the moment there is no clean way to import the "Add/Remove liquidity to AAA-BBB" operations from Cake. \
> In my understanding adding liquidity to a pool should result in a trade of AAA and BBB against the AAA-BBB liquidity pool token (The value of this token should be the added values of AAA and BBB at the moment of the trade). Removing liquidity should result in a trade from AAA-BBB against AAA and BBB. \
> This scripts handles this currently diffrent because of several reasons. AAA and BBB are imported as an expense or income (so taxation might apply to this) by default. Nothing else is imported. No AAA-BBB Token. So if you add liquidity to a pool AAA and BBB are going into a blackbox and reappear from there when you remove them from the pool. \
> This might result in a bad taxation situation, because removing from a pool results in a 100% taxable income for AAA and BBB. If you prefer to import these operations non-taxable, you can do this with the option `--lm-operations-not-taxable`.
> \
> Atm i have no clue how to handle this better, because i am missing some data from Cake to do it better. I would need the size of the pool share i receive or lose and its USD valuation at the moment of the transaction. \
> Feel free to send me ideas and thoughts on this. I would love to optimize this.

## Features

- Combines staking rewards on a daily basis at midnight to reduce the number of CoinTracking imports.
- Supports german and english CoinTracking import.
- [**experimental**] Uses Cake's FIAT valuation for each transaction in USD and converts it to other currencies if needed.

## Installation

[Node.js](https://nodejs.org/) is required to run this script.

Install via npm:
```shell
npm install cake-to-cointracking-converter
```

## Usage

Get your [Cake export CSV](https://pool.cakedefi.com/#/transactions) for each coin and generate a CoinTracking import CSV for each.

Via shell:
```shell
cake2ct --cake-csv "path\to\cake-export-file.csv" --ct-csv "path\to\ct-import-file.csv" --language "DE"
```

[Import](https://cointracking.info/import/import_csv/) the generated CoinTracking CSV. Just select your file, check your imports on the next page and import your data if everthing is fine.

## Options

- `--cake-csv` - Path to Cake CSV.
- `--ct-csv` - Path to CoinTracking CSV.
- `--language` (optional) - Used language for CoinTracking import file. "DE" and "EN" are supported. Default is "EN".
- `--currency` (optional, **experimental**) - Used currency for CoinTracking import file. Default is "USD".
- `--lm-operations-not-taxable` (optional) - Adding to and removing from LM pools is a non-taxable event.

## Supported Cake operations

- Deposit
- Withdrawal
- Withdrawal fee
- Lapis reward
- Lapis DFI Bonus
- Staking reward
- Unstake fee
- Bonus/Airdrop
- Add liquidity XXX-YYY
- Remove liquidity XXX-YYY
- Liquidity mining reward XXX-YYY

---

**Something missing?** Open an [issue](https://github.com/geldmacher/Cake-to-CoinTracking-Converter/issues) or make a PR! ;D