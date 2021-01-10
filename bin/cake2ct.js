#!/usr/bin/env node
const { processCsv } = require('../processCsv');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
    .usage('Usage: cake2ct -cake-csv [path] -ct-csv [path]')
    .demandOption([
        'cake-csv', 'ct-csv'
    ])
    .describe('cake-csv', 'Path to Cake CSV')
    .describe('ct-csv', 'Path to CoinTracking CSV')
    .argv;

processCsv(argv['cake-csv'], argv['ct-csv']);