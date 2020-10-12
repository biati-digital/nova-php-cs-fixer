class SingleProcess {
    constructor(port, processConfig) {
        this.events = [];
        this.processConfig = processConfig;
        this.port = port;
    }

    async start() {
        const stdOut = [];
        const stdErr = [];
        const processInstance = new Process('/usr/bin/env', this.processConfig);

        processInstance.onStdout((result) => {
            stdOut.push(result);
        });
        processInstance.onStderr((line) => {
            stdErr.push(line);
        });
        processInstance.onDidExit((status) => {
            this.didExit(status, stdOut, stdErr.join(' '));
        });

        processInstance.start();
        this.singleProcess = processInstance;

        return processInstance;
    }

    didExit(exitCode, stdOut, stdErr) {
        if (!this.singleProcess) {
            return;
        }

        this.trigger('exit', {
            exitCode,
            stdOut,
            stdErr,
            port: this.port,
        });
    }
    getProcess() {
        return this.singleProcess;
    }
    stop() {
        this.trigger('exit', { status: 0, stdOut: 'stop', stdErr: '', port: this.port });
        this.singleProcess.terminate();
    }
    reload() {
        this.trigger('reload');
        this.singleProcess.terminate();
        this.start();
    }
    on(evt, callback, once = false) {
        this.events.push({ evt, once, callback });
    }
    once(evt, callback) {
        this.on(evt, callback, true);
    }
    trigger(eventName, data = null) {
        const onceTriggered = [];

        this.events.forEach((event, i) => {
            const { evt, once, callback } = event;

            if (evt == eventName) {
                callback(data);
                if (once) {
                    onceTriggered.push(i);
                }
            }
        });
        if (onceTriggered.length) {
            onceTriggered.forEach((i) => this.events.splice(i, 1));
        }
    }
}

module.exports = SingleProcess;
