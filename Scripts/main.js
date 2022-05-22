const { extensionInstaller, copyServiceFiles } = require('./installer.js');
const Server = require('./server.js');
const Formatter = require('./formatter.js');
const compositeDisposable = new CompositeDisposable();
const serverInstance = new Server('PHP CS Fixer', '2.0.0');
const { log, cleanDirectory } = require('./helpers.js');
const phpcsfixerVerion = '3.4.0';

exports.activate = function () {
    const formater = new Formatter(serverInstance, phpcsfixerVerion);

    nova.commands.register(nova.extension.identifier + '.format', (editor) => {
        return formater.format(editor, false);
    });

    nova.workspace.onDidAddTextEditor(async (editor) => {
        return editor.onWillSave(formater.process.bind(formater));
    });

    nova.config.onDidChange(nova.extension.identifier + '.fixerv3', (val) => {
        if (val) {
            log('Installing php-cs-fixer v' + phpcsfixerVerion);
            copyServiceFiles(phpcsfixerVerion);
        }
    });

    extensionInstaller(phpcsfixerVerion, compositeDisposable)
        .catch((err) => {
            log('Failed to activate PHP Fixer', true);
            log(err, true);
            nova.workspace.showErrorMessage(err);
        })
        .then(() => {
            serverInstance.start();
        });
};

exports.deactivate = function () {
    console.log('Deactivate');
    cleanDirectory(nova.extension.workspaceStoragePath);
    compositeDisposable.dispose();
};
