#!/usr/bin/env node
const { processCsv } = require('../processCsv');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
    .usage('Usage: cake2ct --cake-csv [path] --ct-csv [path] --language [xy] --currency [xyz] --lm-operations-not-taxable')
    .demandOption([
        'cake-csv', 'ct-csv'
    ])
    .describe('cake-csv', 'Path to Cake CSV.')
    .describe('ct-csv', 'Path to CoinTracking CSV.')
    .describe('currency', 'Used currency for CoinTracking import file. Default is "USD".')
    .describe('language', '[experimental] Used language for CoinTracking import file. "DE" and "EN" are supported. Default is "EN".')
    .boolean('lm-operations-not-taxable')
    .describe('lm-operations-not-taxable', 'Adding to and removing from LM pools is a non-taxable event')
    .argv;

    console.log(argv);

processCsv(argv['cake-csv'], argv['ct-csv'], argv['language'], argv['currency'], argv['lm-operations-not-taxable']);