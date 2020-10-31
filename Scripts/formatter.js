const beautifyHtml = require('js-beautify').html;
const diff = require('fast-diff');
const extensionConfig = require('./config.js');
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
        if (!this.extensionConfig.onsave || nova.path.extname(editor.document.path) !== '.php' || (this.extensionConfig.ignoreremote && editor.document.isRemote)) {
            log("File not processed because the extension it's configured to not format on save or not format remote files");
            return;
        }
        await this.format(editor, true);
    }

    /*
     * Format
     * start the format process
     */
    async format(editor) {
        const uri = editor.document.uri;
        const filePath = editor.document.path;
        const fileName = nova.path.basename(filePath);
        const documentRange = new Range(0, editor.document.length);
        const content = editor.getTextInRange(documentRange);
        const shouldProcess = this.shouldProcess(editor, content);

        if (!shouldProcess) {
            return;
        }

        let text = content;

        if (this.extensionConfig.htmltry) {
            text = this.formatHTML(text);
        }

        //text = this.prePHPClenup(text);

        const tmpFile = await this.tmpFile(filePath, text);
        const command = await this.getCommand(tmpFile);

        let formatted = false;
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
            formatted.content = this.afterTextFormatted(formatted.content);
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
                config: this.extensionConfig,
            }),
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
                args: cmd,
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
    formatHTML(text) {
        const HTMLConfig = Object.assign(
            {
                indent_size: 4,
                preserve_newlines: true,
                indent_scripts: 'keep',
                indent_with_tabs: false,
                max_preserve_newlines: 10,
                content_unformatted: ['pre', 'code'],
            },
            this.stringToObject(this.extensionConfig.htmlrules)
        );

        HTMLConfig.end_with_newline = false;
        log('Format HTML inside PHP before processing PHP with config');

        const startTime = Date.now();
        log(JSON.stringify(HTMLConfig));
        text = beautifyHtml(text, HTMLConfig);
        const elapsedTime = Date.now() - startTime;
        log(`HTML in PHP formatted in ${elapsedTime}ms`);

        return text;
    }

    /*
     * Some precleanup for more
     * accurate results
     */
    prePHPClenup(text) {
        var re = / *?<\?php([\n\r] +)[A-Za-z]+/g;
        var m;
        do {
            m = re.exec(text);
            if (m) {
                const cleanedStr = m[0].replace(m[1], '\n' + m[0].substring(0, m[0].indexOf('<')));
                text = text.replace(m[0], cleanedStr);
            }
        } while (m);

        return text;
    }

    afterTextFormatted(text) {
        //let re = /{\s\S*( +)\?>[\n\r]+?(<[\S]+.*>[\s\S]*?^<[\/!].*>[\n\r]+?^<\?php)/gm;
        let re = /( +).*\?>[\n\r]+?(^<[\S]+.*>[\s\S]*?[\n\r]+?^<\?php)/gm;
        let m;
        do {
            m = re.exec(text);
            if (m) {
                if (m.length == 3) {
                    var fullmatch = m[0];
                    var space = m[1];
                    var toindent = m[2];

                    // Fix Inlined HTML fix id 1
                    const reindented = this.indentLines(space, toindent);
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

        return text;
    }

    /**
     * Indent lines
     * passed a string it will indent
     * each line with the specified
     * content
     */
    indentLines(before, text) {
        const result = text.split('\n').map((line) => {
            return before + line;
        });

        return result.join('\n');
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
        // No need to update if the content and the
        // formatted content are the same
        if (content == formatted.content) {
            log('Nothing changed so the content will not be updated');
            return false;
        }

        const POSSIBLE_CURSORS = String.fromCharCode(0xfffd, 0xffff, 0x1f094, 0x1f08d, 0xe004, 0x1f08d).split('');
        const documentRange = new Range(0, editor.document.length);
        const selectionStart = editor.selectedRange.start;
        const selectionEnd = editor.selectedRange.end;
        const cursorOffset = selectionEnd;
        const cursor = POSSIBLE_CURSORS.find((cursor) => !content.includes(cursor) && !formatted.content.includes(cursor));

        if (!cursor) {
            editor.edit((e) => {
                e.replace(documentRange, formatted.content);
            });
            return;
        }

        // Insert the cursors
        const textWithCursor = content.slice(0, selectionStart) + cursor + content.slice(selectionStart, selectionEnd) + cursor + content.slice(selectionEnd);

        // Diff
        const edits = diff(textWithCursor, formatted.content);

        let newSelectionStart;
        let newSelectionEnd;

        const editPromise = editor.edit((e) => {
            let offset = 0;
            let toRemove = 0;

            // Add an extra empty edit so any trailing delete is actually run.
            edits.push([diff.EQUAL, '']);

            for (const [edit, str] of edits) {
                if (edit === diff.DELETE) {
                    toRemove += str.length;

                    // Check if the cursors are in here
                    let cursorIndex = -1;
                    while (true) {
                        cursorIndex = str.indexOf(cursor, cursorIndex + 1);
                        if (cursorIndex === -1) break;
                        newSelectionStart ? (newSelectionEnd = offset) : (newSelectionStart = offset);
                        toRemove -= cursor.length;
                    }

                    continue;
                }

                if (edit === diff.EQUAL && toRemove) {
                    e.replace(new Range(offset, offset + toRemove), '');
                } else if (edit === diff.INSERT) {
                    e.replace(new Range(offset, offset + toRemove), str);
                }

                toRemove = 0;
                offset += str.length;
            }
        });

        editPromise
            .then(() => {
                editor.selectedRanges = [new Range(newSelectionStart, newSelectionEnd)];
            })
            .catch((err) => console.error(err));
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
     * Ensure the file is saved
     * deprecated, Nova fixed the error in v2
     *
     * @return void
     */
    async ensureSaved(editor, content, formatted) {
        const { document } = editor;

        if (!document.isDirty) return;
        if (document.isClosed) return;
        if (document.isUntitled) return;

        if (content == formatted.content) {
            return false;
        }
        this.formattedText.set(editor, formatted.content);
        editor.save();
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

            ruleValue = ruleValue == 'true' ? true : ruleValue;
            ruleValue = ruleValue == 'false' ? false : ruleValue;
            rulesObj[ruleName] = ruleValue;
        });

        return rulesObj;
    }
}

module.exports = PHPFormatter;
