const path = require('path');

const SRC_DIR = path.resolve(__dirname, 'src');

module.exports = {
    entry: {
        'utils': path.resolve(SRC_DIR, 'utils.js'),
        'content_scripts/translate': path.resolve(SRC_DIR, 'content_scripts', 'translate.js'),
        'popup/translate': path.resolve(SRC_DIR, 'popup', 'translate.js'),
        'options/options': path.resolve(SRC_DIR, 'options', 'options.js')
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'target')
    }
};
