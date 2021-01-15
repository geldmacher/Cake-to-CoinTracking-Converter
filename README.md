# Cake to CoinTracking Converter

CLI script to translate [Cake](https://pool.cakedefi.com/#?ref=401824) export data to a valid [CoinTracking](https://cointracking.info?ref=G905622) import.

**IMPORTANT**: Make a backup of your trades before you import new data via this script! This script is still in an early beta state. ;) \
**EVEN MORE IMPORTANT**: This is no tax advice! The way this script imports data is potentially wrong.

> **Liquidity Mining** \
> At the moment there is no clean way to import the "Add luquidty to AAA-BBB" operations from Cake. \
> In my understanding adding liquidity to a pool should result in a trade of AAA and BBB against the AAA-BBB liquidity pool token (The value of this token should be the added values of AAA and BBB at the moment of the trade). \
> This scripts handles this currently diffrent because of several reasons. AAA and BBB are imported as an expense (so taxation might apply to this). Nothing else is imported. No AAA-BBB Token, no AAA or BBB Coin/Token. \
> \
> The important part: \
> This scripts does currently not support extracting AAA or BBB from the liquidity pool. I wrote this script just for my self and i don't plan to do this in the foreseeable future. Feel free to send me ideas and thoughts on this. I would love to optimize this.

## Features

- Combines staking rewards on a daily basis at midnight to reduce the number of CoinTracking imports
- Supports german and english CoinTracking import

## Installation

[Node.js](https://nodejs.org/) is required to run this script.

Install via npm:
```shell
npm install cake-to-cointracking-converter
```

## Usage

Get your [Cake export CSV](https://pool.cakedefi.com/#/transactions) for each coin and generate a CoinTracking import SV for each.

Via shell:
```shell
cake2ct --cake-csv "path\to\cake-export-file.csv" --ct-csv "path\to\ct-import-file.csv" --lang "de"
```

[Import](https://cointracking.info/import/import_csv/) the generated CoinTracking Csv. Just select your file, check your imports on the next page and import your data if everthing is fine.

## Options

- `--cake-csv` - Path to Cake CSV.
- `--ct-csv` - Path to CoinTracking CSV.
- `--lang` - Used language for Coinracking import file. `de` and `en` are supported.

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
- Liquidity mining reward XXX-YYY

---

**Something missing?** Open an [issue](https://github.com/geldmacher/Cake-to-CoinTracking-Converter/issues) or make a PR! ;D