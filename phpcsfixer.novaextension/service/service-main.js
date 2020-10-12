const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const cssnext = require('postcss-preset-env');
const cssnested = require('postcss-nested');
const cssmqpacker = require('css-mqpacker');
const beautify = require('js-beautify').css;
const cssclean = require('clean-css');
const sortCSSmq = require('sort-css-media-queries');
const JsonRpcService = require('./json-rpc.js');

class NovaExtensionService {
    constructor() {
        this.jsonRpc = new JsonRpcService(process.stdin, process.stdout);
        this.jsonRpc.onRequest('process', this.process);
        this.jsonRpc.notify('didStart');
    }

    async process({ code, options }) {
        try {
            const plugins = [
                cssnested(),
                cssnext({
                    stage: 0,
                    browsers: ['last 2 version'],
                    features: {
                        calc: false,
                    },
                }),
                cssmqpacker({
                    sort: sortCSSmq,
                }),
            ];

            const result = await postcss(plugins).process(code, {
                from: options.in,
                to: options.out,
            });
            if (result && result.css) {
                let css = result.css;

                // Minify
                if (options.compress) {
                    const minified = new cssclean({ specialComments: 'all' }).minify(css);
                    css = minified.styles;
                }

                css = css.replace(/\/\*!/g, '/*');

                // Beautify
                if (!options.compress) {
                    const tabSize = options.hasOwnProperty('tabSize') ? options.tabSize : 4;
                    const indentWithTabs = options.hasOwnProperty('indentWithTabs') ? options.indentWithTabs : false;

                    css = beautify(css, {
                        indent_size: tabSize,
                        indent_with_tabs: indentWithTabs,
                        preserve_newlines: false,
                        max_preserve_newlines: 2,
                    });
                }

                try {
                    const writeFile = fs.writeFileSync(options.out, css);
                } catch (err) {
                    return { error: false, message: 'Unable to write file' };
                }

                return { error: false, css };
            } else {
                return {
                    error: {
                        message: 'PostCSS resulted in error',
                        stack: result.warnings(),
                    },
                };
            }
        } catch (error) {
            return {
                error: { message: error.message },
            };
        }
    }
}

const server = new NovaExtensionService();
