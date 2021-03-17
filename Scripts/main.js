const extensionInstaller = require('./installer.js');
const Server = require('./server.js');
const Formatter = require('./formatter.js');
const compositeDisposable = new CompositeDisposable();
const serverInstance = new Server('PHP CS Fixer');
const { log, cleanDirectory } = require('./helpers.js');
const phpcsfixerVerion = '2.18.3';

exports.activate = function () {
    const formater = new Formatter(serverInstance, phpcsfixerVerion);

    nova.commands.register(nova.extension.identifier + '.format', (editor) => {
        return formater.format(editor, false);
    });

    nova.workspace.onDidAddTextEditor(async (editor) => {
        return editor.onWillSave(formater.process.bind(formater));
    });

    extensionInstaller(phpcsfixerVerion, compositeDisposable, log)
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
    cleanDirectory(nova.extension.workspaceStoragePath);
    compositeDisposable.dispose();
};
