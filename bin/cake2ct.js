#!/usr/bin/env node
const { processCsv } = require('../processCsv');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
    .usage('Usage: cake2ct --cake-csv [path] --ct-csv [path] --language [xy] --use-cake-fiat-valuation --lm-transfer-operations-not-taxable')
    .demandOption([
        'cake-csv', 'ct-csv'
    ])
    .describe('cake-csv', 'Path to Cake CSV.')
    .describe('ct-csv', 'Path to CoinTracking CSV (Creates one, if is is not existing).')
    .describe('language', 'Used language for CoinTracking import file. "DE" and "EN" are supported. Default is "EN".')
    .boolean('use-cake-fiat-valuation')
    .describe('use-cake-fiat-valuation', 'Use the FIAT transaction valuation from Cake CSV import instead of the valuation data from CoinTracking (Keep in mind that your CoinTracking account currency should match your exported transaction valutation currency from Cake).')
    .boolean('lm-transfer-operations-not-taxable')
    .describe('lm-transfer-operations-not-taxable', 'Handle adding to and removing from LM pools as a non-taxable event.')
    .argv;

processCsv(argv['cake-csv'], argv['ct-csv'], argv['language'], argv['use-cake-fiat-valuation'], argv['lm-transfer-operations-not-taxable']);