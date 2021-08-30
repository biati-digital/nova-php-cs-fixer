const HTMLFormatter = require('./formatter-html.js');
const { log, stringToObject, spacesToTabs, adjustSpacesLength, indentLines } = require('./helpers.js');

/*
 * Format PHP
 * format using js-beautify
 *
 * @param string
 * @return string
 */

class PHPFormatter {
    constructor(data) {
        let { text, editor, config } = data;
        this.config = config;
        this.text = text;
        this.editor = editor;
        this.filePath = editor.document.path;
        this.tabLength = config.phpTabWidth;
        this.softTabs = config.phpUseTabs ? false : true;
        this.indentChar = editor.tabText.charAt(0);
        this.globalCSConfig = config.phpcsconfig;
        this.localCSConfig = this.findLocalCSConfig();
        this.phpcsfixerVersion = config.phpcsfixerVersion;
        this.initialEditorLenght = editor.tabLength;
        this.processFormat = true;

        if (config.phpRespectNova) {
            this.tabLength = editor.tabLength;
            this.softTabs = editor.softTabs;
        }

        if (config.onlyiflocalconfigfile && !this.localCSConfig) {
            log('Enabled "Format on save only if workspace has a config file" and the workspaces does not have a configuration file, process will stop.');
            this.processFormat = false;
        }

        // Temp code to enable v3
        if (config.fixerv3 && config.csfixerpath == '') {
            this.phpcsfixerVersion = '3.1.0';
        }

        return this;
    }

    async beautify() {
        if (!this.processFormat) {
            log('The format process was stopped.');
            return;
        }

        if (this.softTabs && this.initialEditorLenght !== this.tabLength) {
            log(`Adjust the initial tab lenght from ${this.initialEditorLenght} to 4`, this.tabLength);
            this.text = adjustSpacesLength(this.text, this.initialEditorLenght, 4);
        }

        const originalCode = this.text;
        this.text = this.maybeFormatHTML(this.text);
        this.tmpFile = await this.tmpFile(this.filePath, this.text);
        this.command = await this.getCommand(this.tmpFile);

        let formatted = false;
        if (this.config.server) {
            formatted = await this.formatOnServer();
        } else {
            formatted = await this.formatUsingProcess();
        }

        // If no chages detected by php-cs-fixer
        if (formatted.content == originalCode) {
            log('There are no changes in the file since the last time it was formatted, stopping process.');
            return;
        }

        if (!formatted.content) {
            log('Unable to format document' + formatted.error, true);
            return;
        }

        formatted.content = this.maybeApplyAdditionalFixes(formatted.content);
        formatted.content = this.maybeSpacesToTabs(formatted.content);
        formatted.content = this.maybeAdjustSpacesLength(formatted.content);
        formatted.indentRules = {
            tabLength: this.tabLength,
            softTabs: this.softTabs
        };

        return formatted;
    }

    /*
     * Get command
     * generate the command
     * used to call php fixer
     *
     * @return array
     */
    async getCommand(filePath) {
        let config = this.config;
        let phpPath = config.phppath;
        let csfixerPath = config.csfixerpath;
        let userRules = config.rules.trim();
        let globalCSConfig = this.globalCSConfig;
        let localConfigFile = this.localCSConfig;
        let phpStandard = config.standard;
        let configFile = this.getConfigFile();
        let cacheFile = this.cacheFile();

        if (!phpPath) {
            phpPath = 'php';
        }
        if (!csfixerPath) {
            csfixerPath = nova.path.join(nova.extension.globalStoragePath, 'php', 'php-cs-fixer-' + this.phpcsfixerVersion);
        }

        if (config.server) {
            phpPath = phpPath.replace(/(\s+)/g, '\\$1');
            //csfixerPath = csfixerPath.replace(/(\s+)/g, '\\$1');
            //filePath = filePath.replace(/(\s+)/g, '\\$1');
            csfixerPath = '"' + csfixerPath +'"';
            filePath = '"' + filePath +'"';
            cacheFile = cacheFile.replace(/(\s+)/g, '\\$1');
        }


        const cmd = [phpPath, csfixerPath, 'fix', filePath];

        if (phpStandard == 'WordPress') {
            configFile = nova.path.join(nova.extension.path, 'rules/wordpress.php_cs');
        }

        if (userRules) {
            userRules = userRules.replace(/[\u2018\u2019]/g, '"').replace(/[\u201C\u201D]/g, '"').replace(/[“”‘’]/g, '"');
        }

        if (configFile) {
            if (config.server) {
                configFile = configFile.replace(/(\s+)/g, '\\$1');
            }
            cmd.push(`--config=${configFile}`);
        } else {
            let rulesLines = userRules.split('\n');

            if (userRules == '') {
                cmd.push(`--rules=@${phpStandard}`);
            } else if (rulesLines.length == 1 && !userRules.includes('{')) {
                userRules = userRules.replace('@PSR1', '');
                userRules = userRules.replace('@PSR2', '');
                userRules = userRules.replace('@Symfony', '');
                userRules = userRules.replace('@PhpCsFixer', '');
                userRules = userRules.trim();

                log('Additional user rules');
                log(userRulesObj);

                cmd.push(`--rules=@${phpStandard},${userRules}`);
            } else {
                let rulesString = {};
                rulesString[`@${phpStandard}`] = true;
                let userRulesObj = {};

                try {
                    userRulesObj = stringToObject(userRules)
                } catch (error) {
                    log(error, true);
                }

                log('Additional user rules');
                log(userRulesObj);

                rulesString = Object.assign(rulesString, userRulesObj);
                rulesString = JSON.stringify(rulesString);

                if (config.server) {
                    cmd.push(`--rules='${rulesString}'`);
                } else {
                    cmd.push(`--rules=${rulesString}`);
                }
            }
        }

        //cmd.push('--format=json');
        cmd.push('--using-cache=yes');
        cmd.push('--cache-file=' + cacheFile);
        //cmd.push('--diff');

        log('Generated command to fix file');
        log(cmd.join(' '));

        return cmd;
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
    async formatOnServer() {
        const cmd = this.command;
        const config = this.config;
        const filePath = this.tmpFile;
        const startTime = Date.now();
        const serverPort = config.port;
        const serverURL = `http://localhost:${serverPort}/index.php`;

        log('Calling PHP Formatting server on URL');
        log(serverURL);

        const rawResponse = await fetch(serverURL, {
            method: 'post',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file: filePath,
                cmd: cmd,
                config: config
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
            log(response);
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
    async formatUsingProcess() {
        return new Promise((resolve, reject) => {
            const cmd = this.command;
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

                console.log(stdOut.join(''));

                if (stdOut.join('').includes('Fatal error')) {
                    log('FATAL ERROR', true);
                    log(stdOut);
                    format.error = stdOut.join('');
                    reject(format);
                } else if (stdOut && stdOut.join('').includes('Fixed all files')) {
                    let phpCode = '';

                    const filePath = this.tmpFile;
                    const file = nova.fs.open(filePath);
                    phpCode = file.read();
                    file.close();

                    format.success = true;
                    format.content = phpCode;

                    resolve(format);
                } else if (!stdOut.length && stdErr.length == 2 && stdErr[1].includes('cache')) {

                    format.success = true;
                    format.content = this.text; // return the original code
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

    /**
     * Get php-cs-fixer cache file path
     *
     * @return string
     */
    cacheFile() {
        let file = nova.path.join(nova.extension.globalStoragePath, 'php', '.php-cs-fixer.cache');

        try {
            nova.fs.open(file, 'x');
        } catch (error) {
            log('Using existing cache file');
        }

        //file = file.replace(/([ "#&%'$`\\])/g, '\\$1');
        log(`Cache file path is ${file}`);

        return file;
    }

    /*
     * Format inline HTML
     * if enabled in the extension config
     * and if the current file contains HTML
     *
     * @param string
     * @returns string
     */
    maybeFormatHTML(text) {
        if (!this.config.htmltry) {
            return text;
        }

        if (this.config.htmladditional) {
            text = this.preFixes(text);
        }

        const containsHTML =
            /<(br|basefont|hr|input|source|frame|param|area|meta|!--|col|link|option|base|img|wbr|!DOCTYPE).*?>|<(a|abbr|acronym|address|applet|article|aside|audio|b|bdi|bdo|big|blockquote|body|button|canvas|caption|center|cite|code|colgroup|command|datalist|dd|del|details|dfn|dialog|dir|div|dl|dt|em|embed|fieldset|figcaption|figure|font|footer|form|frameset|head|header|hgroup|h1|h2|h3|h4|h5|h6|html|i|iframe|ins|kbd|keygen|label|legend|li|map|mark|menu|meter|nav|noframes|noscript|object|ol|optgroup|output|p|pre|progress|q|rp|rt|ruby|s|samp|script|section|select|small|span|strike|strong|style|sub|summary|sup|table|tbody|td|textarea|tfoot|th|thead|time|title|tr|track|tt|u|ul|var|video).*?<\/\2>/i.test(
                text
            );

        if (!containsHTML) {
            log('The file does not contain HTML, skip HTML formatting');
            return text;
        }

        const phpHTMLFormatted = new HTMLFormatter({
            text: text,
            config: this.config,
            editor: this.editor
        });
        const htmlProcessed = phpHTMLFormatted.beautify();
        return htmlProcessed.content;
    }

    /*
     * Additional Fixes
     * Apply additional fixes if enabled
     * and if the current file contains HTML
     *
     * @param string
     * @returns string
     */
    maybeApplyAdditionalFixes(text) {
        if (!this.config.htmltry || !this.config.htmladditional) {
            return text;
        }

        const containsHTML =
            /<(br|basefont|hr|input|source|frame|param|area|meta|!--|col|link|option|base|img|wbr|!DOCTYPE).*?>|<(a|abbr|acronym|address|applet|article|aside|audio|b|bdi|bdo|big|blockquote|body|button|canvas|caption|center|cite|code|colgroup|command|datalist|dd|del|details|dfn|dialog|dir|div|dl|dt|em|embed|fieldset|figcaption|figure|font|footer|form|frameset|head|header|hgroup|h1|h2|h3|h4|h5|h6|html|i|iframe|ins|kbd|keygen|label|legend|li|map|mark|menu|meter|nav|noframes|noscript|object|ol|optgroup|output|p|pre|progress|q|rp|rt|ruby|s|samp|script|section|select|small|span|strike|strong|style|sub|summary|sup|table|tbody|td|textarea|tfoot|th|thead|time|title|tr|track|tt|u|ul|var|video).*?<\/\2>/i.test(
                text
            );

        if (!containsHTML) {
            log('The file does not contain HTML, skip HTML Additional fixes');
            return text;
        }

        let indentChar = this.indentChar;
        let indentSize = this.tabLength;
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
                    const reindented = indentLines(space, toindent, indentChar, indentSize);
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
        /*let re4 = /(^\s+<\?php)[\s+]?\n(.*?)^\?>$/gms;
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
        } while (m4);*/

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

    /*
     * Convert spaces
     * to tabs if enabled
     *
     * @param string
     * @returns string
     */
    maybeSpacesToTabs(text) {
        if (this.softTabs) {
            return text;
        }

        log('Converting spaces to tabs ' + this.tabLength);
        return spacesToTabs(text, this.tabLength);
    }

    /*
     * Adjust spaces length
     * if needed
     *
     * @param string
     * @returns string
     */
    maybeAdjustSpacesLength(text) {
        if (!this.softTabs || this.tabLength == 4) {
            return text;
        }

        log('Readjust spaces from 4 to ' + this.tabLength);
        return adjustSpacesLength(text, 4, this.tabLength);
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
        const csconf = ['.php_cs.dist', '.php_cs', '.php-cs-fixer.php', '.php-cs-fixer.dist.php'];
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
     * Use config file
     * check if the formatter should use a config
     * file instead of the extension preferences
     *
     * @returns string
     */
    getConfigFile() {
        if (this.localCSConfig) {
            return this.localCSConfig;
        }
        if (this.globalCSConfig) {
            return this.globalCSConfig;
        }
        return false;
    }
}

module.exports = PHPFormatter;
