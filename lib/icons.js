const path = require('path'),
      fs = require('fs-extra');

const svgstore = require('svgstore'),
      browserSync = require('browser-sync');

const rebuildIcons = async function (opts) {
    const store = svgstore({
        cleanDefs: true,
        cleanSymbols: true
    });
    const files = await fs.readdir('src/icons');
    await Promise.all(files.map(async file => {
        if (path.extname(file) !== '.svg') {
            return;
        }
        const data = await fs.readFile(path.join('src/icons', file), 'utf8');
        store.add(path.basename(file, '.svg'), data);
    }));
    fs.writeFile(path.join(opts.outputDir, 'icons.svg'), store.toString(), 'utf8');
    if (browserSync.has('ComigoDocs')) {
        browserSync.get('ComigoDocs').reload('icons.svg');
    } else {
        console.info('Icons compiled');
    }
};

rebuildIcons.serve = function(opts) {
    const watchr = require('watchr');
    const stalker = watchr.create('src/icons/');
    stalker.on('change', () => rebuildIcons(opts));
    stalker.watch(err => {
        if (err) {
            console.error(err);
        }
    });
};

module.exports = rebuildIcons;
