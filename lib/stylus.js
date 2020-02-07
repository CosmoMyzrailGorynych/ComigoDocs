const stylus = require('stylus'),
      fs = require('fs-extra'),
      browserSync = require('browser-sync');
const path = require('path');

const rebuildStylus = async function(options) {
    const data = await fs.readFile('src/stylus/_index.styl', {encoding: 'utf8'});
    const css = await new Promise((resolve, reject) => stylus(data)
        .set('filename', 'src/stylus/_index.styl')
        .render(function (err, css) {
            if (err) {
                reject(err);
                return;
            }
            resolve(css);
        })
    );
    await fs.outputFile(path.join(options.outputDir, 'bundle.css'), css, {encoding: 'utf8'});
    if (browserSync.has('ComigoDocs')) {
        browserSync.get('ComigoDocs').reload('bundle.css');
    } else {
        console.info('Stylus rendered');
    }
};

rebuildStylus.serve = function(opts) {
    const watchr = require('watchr');
    const stalker = watchr.create('src/stylus/');
    stalker.on('change', () => rebuildStylus(opts));
    stalker.watch(err => {
        if (err) {
            console.error(err);
        }
    });
};

module.exports = rebuildStylus;
