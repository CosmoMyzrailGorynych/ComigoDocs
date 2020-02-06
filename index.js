#!/usr/bin/env node

const path = require('path');

const yargs = require('yargs');
const builder = require('./lib/builder');
const server = require('./lib/server');

yargs // eslint-disable-line
.command('build', 'builds a static site', {}, argv => {
    builder(argv);
})
.command('serve [port]', 'start the server', yargs => {
    yargs.positional('port', {
        describe: 'port to bind on',
        default: 8080
    });
}, argv => {
    server(argv);
})
.option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging'
})
.option('input-dir', {
    alias: 'i',
    type: 'string',
    default: path.join(process.cwd(), './docs'),
    description: 'Specify the input directory'
})
.option('output-dir', {
    alias: 'o',
    type: 'string',
    default: path.join(process.cwd(), './dist'),
    description: 'Specify the output directory'
})
.argv;
