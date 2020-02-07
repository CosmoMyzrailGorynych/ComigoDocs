const path = require('path'),
      fs = require('fs-extra');
const glob = require('glob'),
      MultiStream = require('multistream'),
      browserSync = require('browser-sync');

const rebuildScripts = async function (opts) {
    const files = await new Promise((resolve, reject) => {
        glob('src/js/**/*.js', {}, (err, files) => {
            if (err) {
                return reject(err);
            }
            return resolve(files);
        });
    });
    const output = new MultiStream(files.map(file => fs.createReadStream(file)));
    output.pipe(fs.createWriteStream(path.join(opts.outputDir, 'bundle.js')));

    await new Promise((resolve, reject) => {
        output.on('end', err => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
    if (browserSync.has('ComigoDocs')) {
        browserSync.get('ComigoDocs').reload('bundle.js');
    } else {
        console.info('Scripts built');
    }
};

rebuildScripts.serve = function(opts) {
    const watchr = require('watchr');
    const stalker = watchr.create('src/js/');
    stalker.on('change', () => rebuildScripts(opts));
    stalker.watch(err => {
        if (err) {
            console.error(err);
        }
    });
};

module.exports = rebuildScripts;
