const { table, getBorderCharacters } = require('table');
const chalk  = require('chalk');

/**
 * Generate error details output
 * 
 * @param {*} records 
 */
const generateErrorDetailsOverview = (records) => {

    // Error details
    const errorDetails = new Map();

    // Table header
    const header = [
        chalk.dim(chalk.bold('Row ID (Reference)')),
        chalk.dim(chalk.bold('Reason / Error'))
    ];
    errorDetails.set('header', header);

    // Table rows
    records.forEach(record => {
        if(!errorDetails.has(record['Reference'])){
            const data = [
                record['Reference'],
                record['_error']
            ];
            errorDetails.set(record['Reference'], data);
        } 
    });

    // Table output
    return table(Array.from(errorDetails.values()), {
        border: getBorderCharacters(`norc`),
        columnDefault: {
            width: 50
        },
        columns: {
            0: { 
                width: 40
            },
            1: { 
                width: 70
            }
          }
    });
}

module.exports.generateErrorDetailsOverview = generateErrorDetailsOverview;