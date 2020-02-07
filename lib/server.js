const path = require('path');

const watchr = require('watchr');

const stylus = require('./stylus');
const icons = require('./icons');
const scripts = require('./scripts');
const builder = require('./builder');


const startServer = async function (opts) {
    await builder(opts);
    const browserSync = require('browser-sync').create('ComigoDocs');
    browserSync.init({
        server: opts.outputDir,
        port: opts.port
    });

    stylus.serve(opts);
    icons.serve(opts);
    scripts.serve(opts);

    const docStalker = watchr.create(opts.inputDir);
    docStalker.on('change', (type, file) => {
        if (type !== 'update' && type !== 'create') {
            return;
        }
        if (path.extname(file) !== '.md') {
            return;
        }
        builder.rebuildPage(file);
    });
    docStalker.watch(err => {
        if (err) {
            console.error(err);
        }
    });
};

module.exports = startServer;
