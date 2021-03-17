const prettydiff = require('./prettydiff.js');
const { log, stringToObject } = require('./helpers.js');

/*
 * Format Twig
 * format using prettydiff
 * https://github.com/prettydiff/prettydiff
 *
 */
 
class TwigFormatter {
    constructor(data) {
        let { text, editor, config } = data;
        this.config = config;
        this.text = text;
        this.rules = config.twigrules;
        this.tabLength = config.twigTabWidth;
        this.softTabs = config.twigUseTabs ? false : true;

        if (config.twigRespectNova) {
            this.tabLength = editor.tabLength;
            this.softTabs = editor.softTabs;
        }

        return this;
    }
    
    async beautify() {
        log('Starting Twig format');

        let source = this.text;
        let output = '',
            options = prettydiff.options;
        options.mode = 'beautify';
        options.language = 'twig';
        options.preserve = 3;
        options.source = source;
        options.indent_char = this.softTabs ? ' ' : '\t';
        options.indent_size = this.softTabs ? this.tabLength : 0;

        log('Twig options');
        log(options);

        output = prettydiff();

        if (!output) {
            log('Twig error, no output available', true);
            return text;
        }

        log('Twig formatted text');
        log(output);
    
        return {
            content: output,
            indentRules: {
                tabLength: this.tabLength,
                softTabs: this.softTabs
            }
        };
    }
}

module.exports = TwigFormatter;
