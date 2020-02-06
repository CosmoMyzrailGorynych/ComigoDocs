const path = require('path');

const watchr = require('watchr');

const rebuildStylus = require('./stylus');
const builder = require('./builder');


const startServer = async function (opts) {
    await builder(opts);
    const browserSync = require('browser-sync').create('ComigoDocs');
    browserSync.init({
        server: opts.outputDir,
        port: opts.port
    });

    const stylusStalker = watchr.create('src/stylus/');
    stylusStalker.on('change', () => rebuildStylus(opts));
    stylusStalker.watch(err => {
        if (err) {
            console.error(err);
        }
    });

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
