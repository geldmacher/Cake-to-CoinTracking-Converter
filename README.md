# Cake to CoinTracking Converter

CLI script to convert [Cake](https://pool.cakedefi.com/#?ref=401824) export data to an valid [CoinTracking](https://cointracking.info?ref=G905622) import.

## Installation

Install via npm:
```shell
npm install cake-to-cointracking-converter
```

## Usage

Via shell:
```shell
cake2ct --cake-csv "path\to\cake-export-file.csv" --ct-csv "path\to\ct-import-file.csv"
```

## Supported Cake operations

- Deposit
- Withdrawal
- Lapis reward
- Lapis DFI Bonus
- Staking reward
- Unstake fee
- Bonus/Airdrop
- Add liquidity XXX-YYY
- Liquidity mining reward XXX-YYY

**Something missing?** Open an issue or make a PR! ;D