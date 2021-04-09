/* eslint-disable */

const extensionConfig = require('./config.js');
const BladeFormatter = require('./formatter-blade.js');
const TwigFormatter = require('./formatter-twig.js');
const PHPFormatter = require('./formatter-php.js');
const { log, tabsToSpaces } = require('./helpers.js');

class Formatter {
    constructor(server, phpcsfixerVersion) {
        this.server = server;
        this.extensionConfig = extensionConfig();
        this.formattedText = new Map();
        this.extensionConfig.phpcsfixerVersion = phpcsfixerVersion;
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
        const extension = this.getFileExtension(filePath);
        const allowedExtensions = {
            php: true,
            blade: this.extensionConfig.blade,
            twig: this.extensionConfig.twig
        };

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
        const content = editor.getTextInRange(new Range(0, editor.document.length));
        const extension = this.getFileExtension(filePath);

        //let text = tabsToSpaces(content, 4);
        let text = content;
        let formatter = false;
        let processed = false;
        let config = this.extensionConfig;
        let formatterData = { text, editor, config };

        if (extension == 'blade') {
            formatter = new BladeFormatter(formatterData);
        }

        if (extension == 'twig') {
            formatter = new TwigFormatter(formatterData);
        }

        if (extension == 'php') {
            formatter = new PHPFormatter(formatterData);
        }

        if (formatter) {
            processed = await formatter.beautify();
            if (!processed || !processed.content) {
                log('Unable to format document' + processed.error, true);
                return;
            }
            await this.setFormattedValue({ editor, content, processed });
            return true;
        }
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
    async setFormattedValue({ editor, content, processed, range }) {
        if (content == processed.content) {
            log('Nothing changed so the content will not be updated');

            if (processed.indentRules) {
                log('Only updating editor indent');
                log(processed.indentRules);
                editor.tabLength = processed.indentRules.tabLength;
                editor.softTabs = processed.indentRules.softTabs;
            }

            log('Formatting process done');
            return false;
        }

        log('Updating document content');

        const documentRange = range ? range : new Range(0, editor.document.length);
        await editor.edit((e) => {
            e.replace(documentRange, processed.content);
        });

        if (processed.indentRules) {
            log('Updating editor indent');
            log(processed.indentRules);
            editor.tabLength = processed.indentRules.tabLength;
            editor.softTabs = processed.indentRules.softTabs;
        }

        log('Formatting process done');
        return true;
    }

    getFileExtension(filePath) {
        let fileName = nova.path.basename(filePath.toLowerCase());
        let extension = nova.path.extname(filePath).substring(1);

        if (fileName.endsWith('.blade.php')) {
            extension = 'blade';
        }

        return extension;
    }
}

module.exports = Formatter;
