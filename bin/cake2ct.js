#!/usr/bin/env node
const { processCsv } = require('../processCsv');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
    .usage('Usage: cake2ct --cake-csv [path] --ct-csv [path] --language [xy] --use-cointracking-fiat-valuation --consolidate-staking-data')
    .demandOption([
        'cake-csv', 'ct-csv'
    ])
    .describe('cake-csv', 'Path to Cake CSV.')
    .describe('ct-csv', 'Path to CoinTracking CSV (Creates one, if is is not existing).')
    .describe('language', 'Used language for CoinTracking import file. "DE" and "EN" are supported. Default is "EN".')
    .boolean('consolidate-staking-data')
    .describe('consolidate-staking-data', 'Consolidate data from staking operations on a daily basis at midnight.')
    .boolean('use-cointracking-fiat-valuation')
    .describe('use-cake-fiat-valuation', 'Use the FIAT transaction valuation from CoinTracking instead of the valuation data from Cake.')
    .argv;

processCsv(argv['cake-csv'], argv['ct-csv'], argv['language'], argv['use-cointracking-fiat-valuation'], argv['consolidate-staking-data']);