async function copyServiceFiles() {
    const fixerPath = nova.path.join(nova.extension.path, 'php');
    const dependencyDir = nova.path.join(nova.extension.globalStoragePath, 'php');
    const exists = nova.fs.stat(dependencyDir);

    if (!exists) {
        await nova.fs.copy(fixerPath, dependencyDir);
        await makeFileExecutable(nova.path.join(dependencyDir, 'php-cs-fixer'));
    }

    return dependencyDir;
}

async function makeFileExecutable(file) {
    return new Promise((resolve, reject) => {
        const process = new Process('/usr/bin/env', {
            args: ['chmod', 'u+x', file],
        });
        process.onDidExit((status) => {
            if (status === 0) {
                resolve();
            } else {
                reject(status);
            }
        });
        process.start();
    });
}

async function extensionInstaller(disposable, logFn = null) {
    try {
        await copyServiceFiles();
    } catch (err) {
        throw err;
    }
}

module.exports = extensionInstaller;
