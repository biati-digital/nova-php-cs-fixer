const beautifyHtml = require('js-beautify').html;
const { log, stringToObject } = require('./helpers.js');

/*
 * Format HTML
 * format using js-beautify
 *
 */
 
class HTMLFormatter {
    constructor(data) {
        let { text, editor, config } = data;
        this.config = config;
        this.text = text;
        this.formatRules = stringToObject(config.htmlrules);
        this.tabLength = config.phpTabWidth;
        this.softTabs = config.phpUseTabs ? false : true;

        if (config.phpRespectNova) {
            this.tabLength = editor.tabLength;
            this.softTabs = editor.softTabs;
        }

        return this;
    }
    
    beautify(formatRules = false) {
        if (formatRules) {
            this.formatRules = formatRules;
        }
    
        let text = this.text;
        let htmlSoftTabs = this.softTabs;
        let htmlTabLength = this.tabLength;
    
        const HTMLConfig = Object.assign(
            {
                indent_size: htmlTabLength,
                indent_with_tabs: htmlSoftTabs ? false : true,
                preserve_newlines: true,
                indent_scripts: 'keep',
                indent_with_tabs: false,
                max_preserve_newlines: 3,
                content_unformatted: ['pre', 'code']
            },
            this.formatRules
        );
    
        log('Doing HTML');
        log(HTMLConfig);
    
        // Remove PHP from script tags, jsbeautify will mess of the PHP code
        let phpinsidescript = {};
        if (text.includes('<script')) {
            let re = /<script\b[^>]*>([\s\S]*?)<\/script>/gm;
            let m,
                i = 0;
            do {
                m = re.exec(text);
                if (m) {
                    if (m.length == 2) {
                        const script = m[1];
                        if (script.includes('<?php') || script.includes('?>')) {
                            let cleanScript = script.replace(/(<\?php[\s\S]+?.*\?>)/gm, function (m, c) {
                                let id = Math.random().toString(36).substr(2, 9);
                                phpinsidescript[id] = c;
                                return '/*phpscriptplaceholder' + id + '*/';
                            });
    
                            text = text.replace(script, cleanScript);
                        }
                    }
                }
            } while (m);
        }
    
        if (text.includes('?><')) {
            let re2 = /\?>(<\S.+>.*)<\?php/gm;
            let m2;
            do {
                m2 = re2.exec(text);
                if (m2) {
                    if (m2.length == 2) {
                        let full = m2[0];
                        let inner = m2[1];
                        let newIndent = full.replace(inner, '\n' + inner + '\n');
                        text = text.replace(full, newIndent);
                    }
                }
            } while (m2);
        }
    
        HTMLConfig.end_with_newline = false;
        log('Format HTML inside PHP before processing PHP with config');
    
        const startTime = Date.now();
        log(JSON.stringify(HTMLConfig));
        text = beautifyHtml(text, HTMLConfig);
    
        text = text.replace(/< \?/g, '<?');
        text = text.replace(/<\? php/g, '<?php');
        text = text.replace(/ - > /g, '->');
        text = text.replace(/\? >/g, '?>');
        text = text.replace(/\?> ;/g, '?>;');
        text = text.replace(/\?\n.+>$/gm, '?>');
    
        // Restore PHP from script tags
        if (Object.keys(phpinsidescript).length) {
            for (let key in phpinsidescript) {
                text = text.replace('/*phpscriptplaceholder' + key + '*/', phpinsidescript[key]);
            }
            text = text.replace(/\?> ;/g, '?>;');
        }
    
        const elapsedTime = Date.now() - startTime;
        log(`HTML in PHP formatted in ${elapsedTime}ms`);
    
        return {
            content: text,
            indentRules: {
                tabLength: htmlTabLength,
                softTabs: htmlSoftTabs
            }
        };
    }
}

module.exports = HTMLFormatter;
