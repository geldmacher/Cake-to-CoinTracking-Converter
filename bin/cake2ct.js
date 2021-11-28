#!/usr/bin/env node

const { processCsv } = require('../processCsv');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
    .usage('Usage: cake2ct --cake-csv [path] --ct-csv [path] --language [XY] --display-holdings-overview --consolidate-staking-data --use-cointracking-fiat-valuation --no-auto-stake-rewards')
    .demandOption([
        'cake-csv', 
        'ct-csv'
    ])
    .describe('cake-csv', 'Path to Cake CSV.')
    .describe('ct-csv', 'Path to CoinTracking CSV (Creates one, if is is not existing).')
    .describe('language', 'Used language for CoinTracking import file. "DE" and "EN" are supported. Default is "EN".')
    .boolean('display-holdings-overview')
    .describe('display-holdings-overview', 'Displays simple overview of current holdings at cake. You need the export data of your complete Cake usage time. Otherwise this overview is nonsense.')
    .boolean('consolidate-staking-data')
    .describe('consolidate-staking-data', 'Consolidate data from staking operations on a daily basis at midnight.')
    .boolean('use-cointracking-fiat-valuation')
    .describe('use-cointracking-fiat-valuation', 'Use the FIAT transaction valuation from CoinTracking instead of the valuation data from Cake.')
    .boolean('no-auto-stake-rewards')
    .describe('no-auto-stake-rewards', 'Stakable rewards are signed as normal incomes. By default they are signed as staking income. (Liquidity Mining and Staking)')
    .argv;

processCsv(argv['cake-csv'], argv['ct-csv'], argv['language'], argv['use-cointracking-fiat-valuation'], argv['consolidate-staking-data'], argv['display-holdings-overview'], argv['no-auto-stake-rewards']);