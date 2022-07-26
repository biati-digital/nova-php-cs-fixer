const HTMLFormatter = require('./formatter-html.js');
const { log, stringToObject } = require('./helpers.js');

/*
 * Format Blade
 * format using js-beautify
 * https://gist.github.com/brnmonteiro/3660b71dbc68691cdc8ac41cec379e2f
 * https://gist.github.com/mpryvkin/0c46e2493b450f92492e8e9a46ad5d97
 * https://gist.github.com/maliouris/f84b7f3dcb2a71455e693716e76ce302
 *
 * @param string
 * @return string
 */

class BladeFormatter {
    constructor(data) {
        let { text, editor, config } = data;
        this.config = config;
        this.text = text;
        this.editor = editor;
        this.rules = config.bladerules;
        this.tabLength = config.bladeTabWidth;
        this.softTabs = config.bladeUseTabs ? false : true;

        if (config.bladeRespectNova) {
            this.tabLength = editor.tabLength;
            this.softTabs = editor.softTabs;
        }

        return this;
    }

    async beautify() {
        log('Starting Blade format');

        let bladeFormatRules = stringToObject(this.rules);
        bladeFormatRules.indent_size = this.tabLength;
        bladeFormatRules.indent_with_tabs = this.softTabs ? false : true;

        let html = this.bladeToHTML(this.text);

        log('Converted Blade to HTML');
        log(html);

        const bladeHTMLFormatted = new HTMLFormatter({
            text: html,
            config: this.config,
            editor: this.editor
        });
        const htmlProcessed = bladeHTMLFormatted.beautify(bladeFormatRules);
        html = this.htmlToBlade(htmlProcessed.content);

        // Dedent elseif|else inside if blocks
        let elsereg = /(\s+)?@if(.*)?@endif/gms;
        let m1;
        do {
            m1 = elsereg.exec(html);
            if (m1) {
                let fullmatch = m1[0];
                let initialTabSize = m1[1];
                let innerMatch = m1[2];

                if (innerMatch.includes('@else')) {
                    let indentedElse = fullmatch.replace(/^.+?@else/gm, (f) => {
                        if (!bladeFormatRules.indent_with_tabs && f.startsWith(' '.repeat(bladeFormatRules.indent_size))) {
                            f = f.replace(' '.repeat(bladeFormatRules.indent_size), '');
                        }
                        if (bladeFormatRules.indent_with_tabs) {
                            f = f.replace('\t', '');
                        }
                        return f;
                    });
                    html = html.replace(fullmatch, indentedElse);
                }
            }
        } while (m1);

        log('Formatted Blade');
        log(html);

        return {
            content: html,
            indentRules: {
                tabLength: this.tabLength,
                softTabs: this.softTabs
            }
        };
    }

    bladeToHTML(text) {
        if (text.includes('<style')) {
            // Fix @page inside style tags
            text = text.replace(/<style.*>([\s\S]+?)<\/style>/gi, function (s, si) {
                return s.replace(si, si.replace(/@page/g, '.__blade_page'));
            });
        }


        if (text.includes('<script')) {
            text = text.replace(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi, function (s, si) {
                s = s.replace(/\{\{((?:(?!\}\}).)+)\}\}/g, function (m, c) {
                    if (c) {
                        c = c.replace(/(^[ \t]*|[ \t]*$)/g, '');
                    }
                    return '/* beautify ignore:start */{{' + c + '}}/* beautify ignore:end */';
                });

                return s;
            });
        }


        text = text.replace(/\{\{((?:(?!\}\}).)+)\}\}/g, function (m, c) {
            if (c) {
                c = c.replace(/(^[ \t]*|[ \t]*$)/g, '');
                c = c.replace(/'/g, '&#39;');
                c = c.replace(/"/g, '&#34;');
                c = encodeURIComponent(c);
            }
            return '{{' + c + '}}';
        });

        text = text.replace(/^[ \t]*@([a-z]+)([^\r\n]*)$/gim, function (m, d, c) {
            if (c) {
                c = c.replace(/'/g, '&#39;');
                c = c.replace(/"/g, '&#34;');
                c = '|' + encodeURIComponent(c);
            }
            switch (d) {
                case 'php':
                case 'break':
                case 'continue':
                case 'empty':
                case 'elseif':
                case 'else':
                case 'extends':
                case 'case':
                case 'csrf':
                case 'spaceless':
                case 'includeFirst':
                case 'include':
                case 'json':
                case 'method':
                case 'parent':
                case 'stack':
                case 'yield':
                    return '<blade ' + d + c + '/>';
                    break;
                default:
                    if (d.startsWith('end')) {
                        return '</blade ' + d + c + '>';
                    } else {
                        return '<blade ' + d + c + '>';
                    }
                    break;
            }
        });

        if (text.includes('blade endphp>')) {
            text = text.replace(/<blade php\/>/g, '<phptag>{{--');
            text = text.replace(/<\/blade endphp>/g, '--}}</phptag>');
        }

        return text;
    }

    htmlToBlade(text) {
        text = text.replace(/^([ \t]*)<\/?blade ([a-z]+)\|?([^>\/]+)?\/?>$/gim, function (m, s, d, c) {
            if (c) {
                c = decodeURIComponent(c);
                c = c.replace(/&#39;/g, "'");
                c = c.replace(/&#34;/g, '"');
                c = c.replace(/^[ \t]*/g, '');
            } else {
                c = '';
            }
            if (!s) {
                s = '';
            }
            return s + '@' + d + c;
        });
        text = text.replace(/\{\{((?:(?!\}\}).)+)\}\}/g, function (m, c) {
            if (c) {
                c = decodeURIComponent(c);
                c = c.replace(/&#39;/g, "'");
                c = c.replace(/&#34;/g, '"');
                c = c.replace(/(^[ \t]*|[ \t]*$)/g, ' ');
            }
            return '{{' + c + '}}';
        });

        if (text.includes('<phptag>')) {
            text = text.replace(/(.+<phptag>)([\s\S])*?<\/phptag>$/gm, function (m, c) {
                // c is     <phptag>
                //m is the entire php block
                const endTag = c.replace('<phptag>', '@endphp');
                m = m.replace(/<phptag>\{\{--/g, '@php');
                m = m.replace(/--\}\}<\/phptag>/g, endTag);

                return m;
            });
        }

        text = text.replace(/\{\{ --/g, '{{--');
        text = text.replace(/\-- \}\}/g, '--}}');
        text = text.replace(/\.__blade_page/g, '@page');

        // Fix https://github.com/biati-digital/nova-php-cs-fixer/issues/13
        // not sure if a bug,
        text = text.replace(/<blade if\|.+\(([\s\S]+?)\)>/g, function (i, c) {
            let condition = unescape(c);
            condition = condition.replace(/\&#95;/gm, '_');
            condition = condition.replace(/\&quot;/gm, '"');
            condition = condition.replace(/\&quote;/gm, '"');
            condition = condition.replace(/\&#39;/gm, "'");
            condition = condition.replace(/\&#34;/gm, '"');
            condition = condition.replace(/\&#62;/gm, '>');
            condition = condition.replace(/\&#60;/gm, '<');
            return `@if (${condition})`;
        });


        text = text.replace(/\{\{((?:(?!\}\}).)+)\}\}/g, function (m, c) {
            if (c) {
                c = c.replace(/(^[ \t]*|[ \t]*$)/g, '').trim();
            }

            return '{{' + c + '}}';
        });

        if (text.includes('<script')) {
            text = text.replace(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi, function (s, si) {
                s = s.replace(/[\r\n\s]+\/\* beautify ignore:start \*\/\{/gm, '{');
                s = s.replace(/\}\/\* beautify ignore:end \*\/[\r\n\s]+/gm, '}');

                s = s.replace(/\/\* beautify ignore:start \*\/\{/gm, '{');
                s = s.replace(/\}\/\* beautify ignore:end \*\//gm, '}');
                return s;
            });

            text = text.replace(/=\{\{/g, '= {{');
        }

        return text;
    }
}

module.exports = BladeFormatter;
