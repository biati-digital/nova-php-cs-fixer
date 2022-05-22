const SingleProcess = require('./process.js');
const extensionConfig = require('./config.js');
const compositeDisposable = new CompositeDisposable();
const { log } = require('./helpers.js');

class Server {
    constructor(name, version) {
        this.extensionConfig = extensionConfig();
        this.serverrunning = false;
        this.serverVersion = version;
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
            log(`PHP CS Fixer Server changed port to ${val}, restarting server...`);
            this.start();
        });
    }

    async start() {
        if (!this.extensionConfig.server) {
            return false;
        }

        const serverPath = nova.path.join(nova.extension.globalStoragePath, 'php');
        const script = nova.path.join(nova.extension.globalStoragePath, 'php', 'index.php');
        const latestVersion = nova.path.join(nova.extension.globalStoragePath, 'php', `server-${this.serverVersion}.php`);
        let exists = nova.fs.stat(latestVersion);
        
        if (!exists) {
            this.stop();
            
            const scriptFile = nova.path.join(nova.extension.path, 'php', `server-${this.serverVersion}.php`);        
            try {
                nova.fs.copy(scriptFile, nova.path.join(serverPath, `server-${this.serverVersion}.php`));
                nova.fs.remove(script);
                nova.fs.copy(scriptFile, script);
                
            } catch (error) {}
        }
        

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
            log('PHP CS Fixer Server started');
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
        this.mainProcess.reload();
        log('PHP CS Fixer Server reloaded');
    }
    onServerStop() {
        log('PHP CS Fixer Server stopped');
    }
    async onExit(error) {
        // Calling the process returned an error
        // it could be that another workspace already
        // started the server so we need to make sure our server
        // is running otherwise show an error notice
        const serverURL = `http://localhost:${this.extensionConfig.port}/index.php`;
        const rawResponse = await fetch(serverURL, {
            method: 'post',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({})
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
                console.log('PHP CS Fixer already running');
                return true;
            }
        }

        log('PHP CS Fixer Unable to start server, see the error below:', true);
        log(error, true);

        nova.notifications.cancel('phpfixer-success');
        let request = new NotificationRequest('phpfixer-error');

        request.title = nova.localize('PHP CS Fixer Server Error');
        request.body = error;
        request.actions = [nova.localize('Dismiss')];

        let promise = nova.notifications.add(request);
        nova._notificationPostCSSTimer = setTimeout(() => {
            nova.notifications.cancel('phpfixer-error');
        }, 15000);
    }
}

module.exports = Server;
