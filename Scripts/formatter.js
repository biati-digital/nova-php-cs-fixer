/* eslint-disable */

const beautifyHtml = require('js-beautify').html;
const diff = require('fast-diff');
const prettydiff = require('./prettydiff.js');
const extensionConfig = require('./config.js');
const tabsToSpaces = require('./tabs-to-spaces.js');
const { log } = require('./helpers.js');

class PHPFormatter {
    constructor(server) {
        this.server = server;
        this.extensionConfig = extensionConfig();
        this.formattedText = new Map();
        this.localCSConfig = this.findLocalCSConfig();
    }

    /*
     * Process
     * called on event "onWillSave"
     */
    async process(editor) {
        if (!this.extensionConfig.onsave || (this.extensionConfig.ignoreremote && editor.document.isRemote)) {
            log("File not processed because the extension it's configured to not format on save or not format remote files");
            return;
        }

        const filePath = editor.document.path;
        const fileName = nova.path.basename(filePath.toLowerCase());
        const allowedExtensions = {
            php: true,
            blade: this.extensionConfig.blade,
            twig: this.extensionConfig.twig
        };

        let extension = nova.path.extname(editor.document.path).substring(1);

        if (fileName.endsWith('.blade.php')) {
            extension = 'blade';
        }

        if (!allowedExtensions.hasOwnProperty(extension) || !allowedExtensions[extension]) {
            log(`File not processed because the extension it's configured to not format on save files with extension ${extension}`);
            return;
        }

        await this.format(editor, true);
    }

    /*
     * Format
     * start the format process
     */
    async format(editor) {
        const filePath = editor.document.path;
        const fileName = nova.path.basename(filePath.toLowerCase());
        const extension = nova.path.extname(fileName).substring(1);
        const documentRange = new Range(0, editor.document.length);
        const content = editor.getTextInRange(documentRange);
        const shouldProcess = this.shouldProcess(editor, content);

        if (!shouldProcess) {
            return;
        }

        let text = content;
        let formatted = false;

        text = tabsToSpaces(text, 4);

        if (fileName.endsWith('.blade.php')) {
            formatted = this.formatBlade(text);
            await this.setFormattedValue({ editor, content, formatted });
            return true;
        }

        if (extension == 'twig') {
            formatted = this.formatTwig(text);
            await this.setFormattedValue({ editor, content, formatted });
            return true;
        }

        if (this.extensionConfig.htmltry && this.extensionConfig.htmladditional) {
            text = this.preFixes(text);
        }

        if (this.extensionConfig.htmltry) {
            text = this.formatHTML(text);
            formatted = text;
            if (extension == 'html') {
                await this.setFormattedValue({ editor, content, formatted });
                return true;
            }
        }

        const tmpFile = await this.tmpFile(filePath, text);
        const command = await this.getCommand(tmpFile);

        if (this.extensionConfig.server) {
            formatted = await this.formatOnServer(command, tmpFile);
        } else {
            formatted = await this.formatUsingProcess(command, tmpFile);
        }

        if (!formatted || !formatted.content) {
            log('Unable to format document' + formatted.error, true);
            return;
        }

        if (this.extensionConfig.htmladditional) {
            formatted.content = this.additionalHTMLFixes(formatted.content, editor);
        }

        await this.setFormattedValue({ editor, content, formatted });
    }

    /*
     * Format on server
     * call php cs fixer using
     * the running server
     *
     * @param string command
     * @param string temp file path
     * @returns mixed
     */
    async formatOnServer(cmd, filePath) {
        const startTime = Date.now();
        const serverPort = this.extensionConfig.port;
        const serverURL = `http://localhost:${serverPort}/index.php`;

        log('Calling PHP Formatting server on URL');
        log(serverURL);

        const rawResponse = await fetch(serverURL, {
            method: 'post',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file: filePath,
                cmd: cmd,
                config: this.extensionConfig
            })
        });

        if (!rawResponse.ok) {
            log('The server returned an error', true);
        }

        let response = false;

        try {
            response = await rawResponse.json();
        } catch (error) {
            log(error, true);
        }

        if (typeof response == 'object' && response.success) {
            log('Server response');
            log(JSON.stringify(response));
        }

        const elapsedTime = Date.now() - startTime;
        log(`PHP formatted in server took ${elapsedTime}ms`);

        return response;
    }

    /*
     * Format with a process
     * call php cs fixer using
     * a process
     *
     * @param string command
     * @param string temp file path
     * @returns mixed
     */
    async formatUsingProcess(cmd, filePath) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const format = { error: false, success: false, content: '' };
            const stdOut = [];
            const stdErr = [];
            const process = new Process('/usr/bin/env', {
                args: cmd
            });

            log('Calling PHP Formatting using a process');

            process.onStdout((result) => {
                stdOut.push(result);
            });
            process.onStderr((line) => {
                stdErr.push(line);
            });

            process.onDidExit((status) => {
                const elapsedTime = Date.now() - startTime;
                log(`PHP formatted in process took ${elapsedTime}ms`);

                if (stdOut && stdOut.join('').includes('Fixed all files')) {
                    let phpCode = '';

                    const file = nova.fs.open(filePath);
                    phpCode = file.read();
                    file.close();

                    format.success = true;
                    format.content = phpCode;

                    resolve(format);
                } else if (stdErr && stdErr.length > 0) {
                    let errorMessage = stdErr.join(' ');
                    log('Formatting process error');
                    log(errorMessage);

                    format.error = errorMessage;
                    reject(format);
                }
            });

            process.start();
        });
    }

    /*
     * Format HTML
     * format using js-beautify
     *
     * @param string
     * @return string
     */
    formatHTML(text, formatRules = false) {
        if (!formatRules) {
            formatRules = this.stringToObject(this.extensionConfig.htmlrules);
        }

        const HTMLConfig = Object.assign(
            {
                indent_size: this.extensionConfig.htmlTabWidth,
                indent_with_tabs: this.extensionConfig.htmlUseTabs,
                preserve_newlines: true,
                indent_scripts: 'keep',
                indent_with_tabs: false,
                max_preserve_newlines: 3,
                content_unformatted: ['pre', 'code']
            },
            formatRules
        );

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
                        if (script.includes('<?php') && script.includes('?>')) {
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

        // Restore PHP from script tags
        if (Object.keys(phpinsidescript).length) {
            for (let key in phpinsidescript) {
                text = text.replace('/*phpscriptplaceholder' + key + '*/', phpinsidescript[key]);
            }
            text = text.replace(/\?> ;/g, '?>;');
        }

        const elapsedTime = Date.now() - startTime;
        log(`HTML in PHP formatted in ${elapsedTime}ms`);

        return text;
    }

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
    formatBlade(text) {
        log('Starting Blade format');

        let html = text;
        html = html.replace(/\{\{((?:(?!\}\}).)+)\}\}/g, function (m, c) {
            if (c) {
                c = c.replace(/(^[ \t]*|[ \t]*$)/g, '');
                c = c.replace(/'/g, '&#39;');
                c = c.replace(/"/g, '&#34;');
                c = encodeURIComponent(c);
            }
            return '{{' + c + '}}';
        });

        html = html.replace(/^[ \t]*@([a-z]+)([^\r\n]*)$/gim, function (m, d, c) {
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

        let bladeFormatRules = this.stringToObject(this.extensionConfig.bladerules);
        bladeFormatRules.indent_size = this.extensionConfig.bladeTabWidth;
        bladeFormatRules.indent_with_tabs = this.extensionConfig.bladeUseTabs;

        if (html.includes('blade endphp>')) {
            html = html.replace(/<blade php\/>/g, '<phptag>{{--');
            html = html.replace(/<\/blade endphp>/g, '--}}</phptag>');
        }

        log('Converted Blade to HTML');
        log(html);

        html = this.formatHTML(html, bladeFormatRules);

        html = html.replace(/^([ \t]*)<\/?blade ([a-z]+)\|?([^>\/]+)?\/?>$/gim, function (m, s, d, c) {
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
        html = html.replace(/\{\{((?:(?!\}\}).)+)\}\}/g, function (m, c) {
            if (c) {
                c = decodeURIComponent(c);
                c = c.replace(/&#39;/g, "'");
                c = c.replace(/&#34;/g, '"');
                c = c.replace(/(^[ \t]*|[ \t]*$)/g, ' ');
            }
            return '{{' + c + '}}';
        });

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
                    let replaceRegex = new RegExp('', 's');
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

        html = html.replace(/\{\{ --/g, '{{--');
        html = html.replace(/\-- \}\}/g, '--}}');

        if (html.includes('<phptag>')) {
            html = html.replace(/(.+<phptag>)([\s\S])*?<\/phptag>$/gm, function (m, c) {
                // c is     <phptag>
                //m is the entire php block
                const endTag = c.replace('<phptag>', '@endphp');
                m = m.replace(/<phptag>\{\{--/g, '@php');
                m = m.replace(/--\}\}<\/phptag>/g, endTag);

                return m;
            });
        }

        log('Restored Blade from formatted HTML');
        log(html);

        return html;
    }

    /*
     * Format Twig
     * format using prettydiff
     * https://github.com/prettydiff/prettydiff
     *
     * @param string
     * @return string
     */
    formatTwig(text) {
        log('Starting Twig format');

        let source = text;
        let output = '',
            options = prettydiff.options;
        options.mode = 'beautify';
        options.language = 'twig';
        options.preserve = 3;
        options.source = source;

        let tabSize = this.extensionConfig.twigTabWidth;
        let indentChar = ' ';

        if (this.extensionConfig.twigUseTabs) {
            tabSize = 0;
            indentChar = '\t';
        }

        options.indent_char = indentChar;
        options.indent_size = tabSize;

        log('Twig options');
        log(JSON.stringify(options));

        output = prettydiff();

        if (!output) {
            log('Twig error, no output available', true);
            return text;
        }

        log('Twig formatted text');
        log(output);

        return output;
    }

    /*
     * Some precleanup for more
     * accurate results
     */
    preFixes(text) {
        text = text.replace(/^(\s+)?<\?php(\s+if\s?\(.+\)\s?{$)/gm, function (m, s, c) {
            if (typeof s == 'undefined') {
                return m;
            }
            // fixes lines like <?php if (has_nav_menu('top-menu')) {
            // will be converted to
            // <?php
            // if (has_nav_menu('top-menu')) {
            const indented = '\n' + s + c.trim();
            return m.replace(c, indented);
        });
        return text;
    }

    additionalHTMLFixes(text, editor) {
        let indentChar = editor.tabText.charAt(0);
        let indentSize = editor.tabLength;
        let re = /( +).*\?>[\n\r]+?(^<[\S]+.*>[\s\S]*?[\n\r]+?^<\?php)/gm;
        let m;
        do {
            m = re.exec(text);
            if (m) {
                if (m.length == 3) {
                    const fullmatch = m[0];
                    const toindent = m[2];
                    let space = m[1];

                    if (space.length == 1) {
                        space = '';
                    }

                    // Fix Inlined HTML fix id 1
                    const reindented = this.indentLines(space, toindent, indentChar, indentSize);
                    const newFixed = fullmatch.replace(toindent, reindented);
                    text = text.replace(fullmatch, newFixed);
                }
            }
        } while (m);

        // Fix no space in closing PHP tag id 2
        text = text.replace(/}\?>/, '} ?>');

        // Fix no space in closing PHP tag and html tag id 3
        let re3 = /( +)?\?>( +)?<\w+>/gm;
        let m3;
        do {
            m3 = re3.exec(text);
            if (m3) {
                const fullmatch = m3[0];
                let fixed = '';

                if (m3.length == 2) {
                    fixed = fullmatch.replace(m3[1], '\n');
                }
                if (m3.length == 3) {
                    let space = m3[1] ? m3[1] : '';
                    if (!m3[2]) {
                        fixed = fullmatch.replace('?><', '?>\n<' + space);
                    } else {
                        fixed = fullmatch.replace('>' + m3[2], '>\n' + space);
                    }
                }
                if (fixed) {
                    text = text.replace(fullmatch, fixed);
                }
            }
        } while (m3);

        // Fix PHP open tag indentation fix id 4
        let re4 = /(^\s+<\?php)[\s+]?\n(.*?)^\?>$/gms;
        let m4;
        do {
            m4 = re4.exec(text);
            if (m4) {
                const fullmatch = m4[0];
                const startTag = m4[1];
                const innerMatch = m4[2];

                if (!startTag.startsWith('<')) {
                    let innerLines = innerMatch.split('\n');
                    let firstLine = '';

                    for (let i = 0; i < innerLines.length; i++) {
                        if (innerLines[i].trim() !== '') {
                            firstLine = innerLines[i];
                            break;
                        }
                    }

                    if (firstLine.charAt(0).trim() !== '') {
                        let cleanedStart = startTag.trim();
                        let cleanedMatch = fullmatch.replace(startTag, cleanedStart);
                        //text = text.replace(fullmatch, cleanedMatch);
                        console.log('firstLine char');
                        console.log(firstLine.charAt(0));
                    }
                }
            }
        } while (m4);

        // Fix < ? php tags  id 5
        /*if (text.includes('<script') && text.includes('</script>')) {
            text = text.replace(/< \?/g, '<?');
            text = text.replace(/<\? php/g, '<?php');
            text = text.replace(/ - > /g, '->');
            text = text.replace(/\? >/g, '?>');
            text = text.replace(/\?> ;/g, '?>;');
            text = text.replace(/\?\n.+>$/gm, '?>');
        }*/

        return text;
    }

    /**
     * Indent lines
     * passed a string it will indent
     * each line with the specified
     * content
     */
    indentLines(before, text, indentChar, indentSize) {
        let indentMore = false;
        let prevprocessedLineWhiteSpace = -1;

        indentSize = parseInt(indentSize);

        const lines = text.split('\n');

        lines.forEach((line, index) => {
            let space = before;
            let currentline = line.trim();

            if (currentline !== '') {
                if (prevprocessedLineWhiteSpace < 0) {
                    prevprocessedLineWhiteSpace = 0;
                }

                if (indentMore) {
                    space = space + ' '.repeat(indentSize);
                }

                if (currentline.startsWith('<script')) {
                    indentMore = true;
                }

                if (currentline.startsWith('</script')) {
                    space = before;
                    indentMore = false;
                }

                let lineCleanIndent = 0;
                for (var i = 0; i < line.length; i++) {
                    let charIs = line.charAt(i);
                    if (charIs !== ' ') {
                        break;
                    }
                    lineCleanIndent = lineCleanIndent + 1;
                }

                let isClosingLine = false;

                if (currentline.startsWith('}')) {
                    isClosingLine = true;
                }

                if (isClosingLine) {
                    console.log('this is a closing line', currentline);
                    console.log('Indent is', prevprocessedLineWhiteSpace, lineCleanIndent);
                    lines[index] = space + currentline;
                    prevprocessedLineWhiteSpace = lineCleanIndent;
                } else {
                    console.log('line: ', line, lineCleanIndent, prevprocessedLineWhiteSpace);
                    if (lineCleanIndent > prevprocessedLineWhiteSpace + indentSize) {
                        line = ' '.repeat(prevprocessedLineWhiteSpace + indentSize) + currentline;
                        prevprocessedLineWhiteSpace = prevprocessedLineWhiteSpace + indentSize;
                    } else {
                        prevprocessedLineWhiteSpace = lineCleanIndent;
                    }
                }

                lines[index] = space + line;
            }
        });
        return lines.join('\n');
    }

    /*
     * Set Formatted value
     * once the content is formatted
     * set the editor content and cursor
     * position if required
     * Code by alexanderweiss from the prettier extension
     * https://github.com/alexanderweiss/nova-prettier
     *
     */
    async setFormattedValue({ editor, content, formatted }) {
        let formattedText = '';
        if (typeof formatted == 'string') {
            formattedText = formatted;
        } else {
            formattedText = formatted.content;
        }

        // No need to update if the content and the
        // formatted content are the same
        if (content == formattedText) {
            log('Nothing changed so the content will not be updated');
            return false;
        }

        log('Updating document content');
        await this.setEditorContent(editor, formattedText);
        return true;
    }

    async setEditorContent(editor, formatted, range = false) {
        const { document } = editor;
        const cursorPosition = editor.selectedRange.end;
        const documentRange = range ? range : new Range(0, document.length);

        await editor.edit((e) => {
            e.replace(documentRange, formatted);
        });
    }

    /*
     * Get command
     * generate the command
     * used to call php fixer
     *
     * @return array
     */
    async getCommand(filePath) {
        let phpPath = this.extensionConfig.phppath;
        let csfixerPath = this.extensionConfig.csfixerpath;
        let userRules = this.extensionConfig.rules;
        let globalCSConfig = this.extensionConfig.phpcsconfig;
        let localConfigFile = this.localCSConfig;

        if (!phpPath) {
            phpPath = 'php';
        }
        if (!csfixerPath) {
            csfixerPath = nova.path.join(nova.extension.globalStoragePath, 'php', 'php-cs-fixer');
        }

        if (this.extensionConfig.server) {
            phpPath = phpPath.replace(/(\s+)/g, '\\$1');
            csfixerPath = csfixerPath.replace(/(\s+)/g, '\\$1');
            filePath = filePath.replace(/(\s+)/g, '\\$1');
        }

        const cmd = [phpPath, csfixerPath, 'fix', filePath];

        if (localConfigFile) {
            localConfigFile = localConfigFile.replace(/(\s+)/g, '\\$1');
            cmd.push(`--config=${localConfigFile}`);
        } else if (globalCSConfig) {
            globalCSConfig = globalCSConfig.replace(/(\s+)/g, '\\$1');
            cmd.push(`--config=${globalCSConfig}`);
        } else if (userRules) {
            const rulesLines = userRules.split('\n');

            if (rulesLines.length == 1) {
                let rules = `--rules=${userRules}`;
                cmd.push(rules);
            } else {
                const rulesString = JSON.stringify(this.stringToObject(userRules));
                let rules = `--rules='${rulesString}'`;
                cmd.push(rules);
            }
        }

        log('Generated command to fix file');
        log(cmd.join(' '));

        return cmd;
    }

    /*
     * Check if should process
     * formatting, this extension will trigger
     * save and in those cases the process
     * must be ignored
     *
     * @return bool
     */
    shouldProcess(editor, content) {
        const previouslyFormattedText = this.formattedText.get(editor);
        if (previouslyFormattedText) {
            this.formattedText.delete(editor);
            if (previouslyFormattedText === content) {
                return false;
            }
        }

        return true;
    }

    /*
     * PHP CS FIxer temp file
     * a temp file is required to process PHP
     *
     * @return string temp file path
     */
    async tmpFile(file, content) {
        const tempdir = nova.fs.stat(nova.extension.workspaceStoragePath);
        if (!tempdir) {
            nova.fs.mkdir(nova.extension.workspaceStoragePath);
        }

        const fileID =
            file
                .replace('.php', '')
                .replace(/[^a-zA-Z]/g, '')
                .toLowerCase()
                .trim() + '.php';
        const tmpFilePath = nova.path.join(nova.extension.workspaceStoragePath, fileID);

        const tmpfile = await nova.fs.open(tmpFilePath, 'w');
        await tmpfile.write(content, 'utf-8');
        tmpfile.close();

        log('temp file created in');
        log(tmpFilePath);

        return tmpFilePath;
    }

    /*
     * Find local cs fixer config file
     * this file must exist in the root
     * of the active workspace
     *
     * @return boolean
     */
    findLocalCSConfig() {
        if (!nova.workspace.path) {
            return false;
        }

        let found = false;
        const csconf = ['.php_cs.dist', '.php_cs'];
        csconf.forEach((name) => {
            const cfpath = nova.path.join(nova.workspace.path, name);
            const hasConfig = nova.fs.stat(cfpath);

            if (hasConfig) {
                found = cfpath;
            }
        });

        return found;
    }

    /*
     * rescan workspace
     * looking for local config file
     */
    rescanLocalCSConfig() {}

    /**
     * Convert a string
     * into an object
     */
    stringToObject(str) {
        const rulesLines = str.split('\n');

        const rulesObj = {};

        rulesLines.forEach((ruleLine) => {
            ruleLine = ruleLine.trim();

            if (ruleLine == '{' || ruleLine == '}') {
                return;
            }

            let ruleName = ruleLine.substring(0, ruleLine.indexOf(':')).trim();
            let ruleValue = ruleLine.substring(ruleLine.indexOf(':') + 1).trim();

            if (ruleValue.startsWith('[') && ruleValue.endsWith(']')) {
                ruleValue = ruleValue.replace('[', '').replace(']', '');
                ruleValue = ruleValue.replace(/, '/g, ',');
                ruleValue = ruleValue.replace(/, "/g, ',');
                ruleValue = ruleValue.replace(/'/g, '');
                ruleValue = ruleValue.replace(/"/g, '');
                ruleValue = ruleValue.trim().split(',');
            } else if (ruleValue.includes('{') && ruleValue.includes('}')) {
                ruleValue = JSON.parse(ruleValue);
            }

            ruleName = ruleName.replace(/"/g, '');
            ruleName = ruleName.replace(/'/g, '');

            ruleValue = ruleValue == 'true' ? true : ruleValue;
            ruleValue = ruleValue == 'false' ? false : ruleValue;
            rulesObj[ruleName] = ruleValue;
        });

        return rulesObj;
    }
}

module.exports = PHPFormatter;
