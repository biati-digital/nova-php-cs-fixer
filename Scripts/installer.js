async function copyServiceFiles(version) {
    const fixerPath = nova.path.join(nova.extension.path, 'php');
    const dependencyDir = nova.path.join(nova.extension.globalStoragePath, 'php');
    const phpcsfixerFile = 'php-cs-fixer-' + version;
    const phpcsfixerFilePath = nova.path.join(dependencyDir, phpcsfixerFile);
    let exists = nova.fs.stat(dependencyDir);

    if (!nova.fs.stat(phpcsfixerFilePath) && exists) {
        await nova.fs.rmdir(dependencyDir);
        exists = false;
    }

    if (!exists) {
        try {
            await nova.fs.copy(fixerPath, dependencyDir);
        } catch (error) {
            console.error(error);
        }

        await makeFileExecutable(nova.path.join(dependencyDir, phpcsfixerFile));
    }

    return dependencyDir;
}

async function makeFileExecutable(file) {
    return new Promise((resolve, reject) => {
        const process = new Process('/usr/bin/env', {
            args: ['chmod', 'u+x', file]
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

async function extensionInstaller(version, disposable) {
    try {
        await copyServiceFiles(version);
    } catch (err) {
        throw err;
    }
}

module.exports = {
    copyServiceFiles,
    extensionInstaller
};
