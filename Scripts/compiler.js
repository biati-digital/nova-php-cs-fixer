const extensionConfig = require('./config.js');
const { log } = require('./helpers.js');

class CSSCompiler {
    constructor(mainProcess) {
        this.mainProcess = mainProcess;
        this.extensionConfig = extensionConfig();
    }

    async compile(editor) {
        if (nova.path.extname(editor.document.path) !== '.css') {
            return;
        }

        if (this.mainProcess.starting) {
            log('PostCSS service is still starting, please wait a few seconds...');
            return;
        }

        if (!this.mainProcess.processRunning && this.mainProcess.dependenciesReady) {
            if (this.mainProcess.hardCrash) {
                log('PostCSS service had a hard crash, something is not right.', true);
                return false;
            }

            log('postcss service not running, starting...');

            await this.mainProcess.start();
            return;
        }

        const uri = editor.document.uri;
        const filePath = editor.document.path;
        const fileName = nova.path.basename(filePath);
        const selectedRanges = editor.selectedRanges;
        const documentLength = editor.document.length;
        const documentRange = new Range(0, documentLength);
        const firstLineRange = editor.getLineRangeForRange(new Range(0, 1));
        const postCSSServer = this.mainProcess.getProcess();

        let content = editor.getTextInRange(documentRange);
        let firstLine = editor.getTextInRange(firstLineRange);
        let tmpFileGenerated = false;

        if (content) {
            content = content.trim();
        }
        if (firstLine) {
            firstLine = firstLine.trim();
        }

        //const config = options.parse(firstLine, filePath);
        const config = false;

        if (!config) {
            return false;
        }

        if (config.compileExternal) {
            try {
                const external = nova.fs.open(config.in);
                content = external.read();
                content = content.trim();
                external.close();
            } catch (error) {
                console.log(error);
            }
        }

        const checkImports = await handleImports(content, nova.workspace.path);

        if (checkImports.found) {
            const tempdir = nova.fs.stat(nova.extension.workspaceStoragePath);
            if (!tempdir) {
                nova.fs.mkdir(nova.extension.workspaceStoragePath);
            }

            if (!checkImports.code) {
                log('Unable to get code from inported files in document', true);
                return false;
            }

            content = checkImports.code;
        }

        const startTime = Date.now();
        log('Starting PostCSS compiler');
        const result = await postCSSServer.request('process', {
            code: content,
            options: config,
        });

        if (!result || result.error) {
            log('PostCSS error', true);
            log(result.error.message, true);

            nova.notifications.cancel('postcss-success');
            let request = new NotificationRequest('postcss-error');

            request.title = nova.localize('PostCSS Compile Error');
            request.body = result.error.message;
            request.actions = [nova.localize('Dismiss')];

            let promise = nova.notifications.add(request);
            nova._notificationPostCSSTimer = setTimeout(function () {
                nova.notifications.cancel('postcss-error');
            }, 10000);
            return false;
        }

        const elapsedTime = Date.now() - startTime;
        log(`PostCSS process completed in ${elapsedTime}ms`);

        if (nova._notificationPostCSSTimer) {
            clearTimeout(nova._notificationPostCSSTimer);
        }

        if (this.extensionConfig.successNotify == 'Yes') {
            nova.notifications.cancel('postcss-error');
            let request = new NotificationRequest('postcss-success');
            request.title = nova.localize('PostCSS Compiled');
            request.body = nova.localize(`CSS code compiled in ${elapsedTime}ms`);

            let promise = nova.notifications.add(request);

            nova._notificationPostCSSTimer = setTimeout(function () {
                nova.notifications.cancel('postcss-success');
            }, 3000);
        }

        return false;
    }
}

module.exports = CSSCompiler;
