const extensionInstaller = require('./installer.js');
//const SingleProcess = require('./process.js');
const Server = require('./server.js');
const PHPFormatter = require('./formatter.js');
const compositeDisposable = new CompositeDisposable();
const { log } = require('./helpers.js');
const serverInstance = new Server('PHP CS Fixer');

exports.activate = function () {
    const formater = new PHPFormatter(serverInstance);

    nova.workspace.onDidAddTextEditor((editor) => {
        return editor.onWillSave(formater.process.bind(formater));
    });

    extensionInstaller(compositeDisposable, log)
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
    compositeDisposable.dispose();
};
