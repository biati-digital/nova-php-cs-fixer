const SingleProcess = require('./process.js');
const extensionConfig = require('./config.js');
const compositeDisposable = new CompositeDisposable();
const { log } = require('./helpers.js');

class Server {
    constructor(name) {
        this.extensionConfig = extensionConfig();
        this.serverrunning = false;
        this.processes = new Map();
        this.processesArr = [];

        // Listen for changes ine extension config to adjust the server
        nova.config.onDidChange(nova.extension.identifier + '.server', (val) => {
            if (val) {
                this.start();
            } else {
                this.stop();
            }
        });
        nova.config.observe(nova.extension.identifier + '.port', (val, prevVal) => {
            if (!prevVal) {
                // Extension is initializing, ignore event
                return;
            }
            const previousServer = this.processes.get(parseInt(prevVal));
            if (previousServer) {
                try {
                    previousServer.terminate();
                } catch (error) {}
            }
            log(`PHP Server changed port to ${val}, restart server...`);
            this.start();
        });
    }

    async start() {
        if (!this.extensionConfig.server) {
            return false;
        }

        return false;

        const serverPath = nova.path.join(nova.extension.globalStoragePath, 'php');
        const script = nova.path.join(nova.extension.globalStoragePath, 'php', 'index.php');

        let phpPath = this.extensionConfig.phppath;

        if (!phpPath) {
            phpPath = 'php';
        }

        this.mainProcess = new SingleProcess(this.extensionConfig.port, {
            args: [phpPath, '-S', 'localhost:' + this.extensionConfig.port, script],
            cwd: serverPath,
            shell: true
        });

        this.mainProcess.on('start', () => {
            log('PHP CS Fixer Server Start');
        });
        this.mainProcess.on('exit', ({ status, stdOut, stdErr, port }) => {
            if (this.processes.get(port)) {
                this.processes.delete(port);
            }
            if (stdOut == 'stop') {
                return this.onServerStop();
            }
            let error = stdErr.trim();
            if (error) {
                this.onExit(error);
            }
        });

        this.mainProcess.start();
        this.processes.set(this.extensionConfig.port, this.mainProcess.getProcess());
    }
    stop() {
        if (!this.mainProcess) {
            return;
        }
        this.mainProcess.stop();
    }
    reload() {
        if (!this.mainProcess) {
            return;
        }
        log('PHP CS Fixer Reloading Server');
        this.mainProcess.reload();
    }
    onServerStop() {
        log('PHP CS Fixer Server stopped correctly');
    }
    async onExit(error) {
        // Calling the process returned an error
        // it could be that another workspace already
        // started the server so we need to make sure our server
        // is running otherwise show an error notice
        const serverURL = `http://localhost:${this.extensionConfig.port}/index.php`;
        const rawResponse = await fetch(serverURL, {
            method: 'post',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
        });

        if (rawResponse.ok) {
            let response = false;

            try {
                response = await rawResponse.json();
            } catch (error) {
                log(error, true);
            }

            // Our server is already runnig, ignore error
            if (typeof response == 'object' && response.id == 'phpcsfixer') {
                console.log('already runnign server');
                return true;
            }
        }

        log('PHP CS Fixer Server did not started, see the error below:', true);
        log(error, true);

        nova.notifications.cancel('phpfixer-success');
        let request = new NotificationRequest('phpfixer-error');

        request.title = nova.localize('PHP Server Error');
        request.body = error;
        request.actions = [nova.localize('Dismiss')];

        let promise = nova.notifications.add(request);
        nova._notificationPostCSSTimer = setTimeout(() => {
            nova.notifications.cancel('phpfixer-error');
        }, 15000);
    }
}

module.exports = Server;
