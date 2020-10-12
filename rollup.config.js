const commonjs = require('@rollup/plugin-commonjs');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const json = require('@rollup/plugin-json');

module.exports = {
    input: 'Scripts/main.js',
    plugins: [nodeResolve(), json(), commonjs()],
    output: {
        file: 'phpcsfixer.novaextension/Scripts/main.dist.js',
        sourcemap: false,
        format: 'cjs',
    },
};
