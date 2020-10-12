const options = {
    phppath: '',
    csfixerpath: '',
    onsave: '',
    port: '',
    server: '',
    log: '',
    rules: '',
    phpcsconfig: '',
    htmltry: '',
    htmlrules: '',
};

let cachedOptions = false;
let observing = false;

function observeOptionChange(options) {
    if (observing) {
        return false;
    }

    for (const key in options) {
        if (options.hasOwnProperty(key)) {
            const optionID = nova.extension.identifier + '.' + key;
            nova.config.onDidChange(optionID, (val) => {
                options[key] = val;
            });
        }
    }

    observing = true;
}

function extensionConfig() {
    if (cachedOptions) {
        return cachedOptions;
    }

    let extOptions = {};
    for (const key in options) {
        if (options.hasOwnProperty(key)) {
            const optionID = nova.extension.identifier + '.' + key;
            const opt = nova.config.get(optionID);
            extOptions[key] = opt;
        }
    }
    cachedOptions = extOptions;

    observeOptionChange(extOptions);

    return extOptions;
}

module.exports = extensionConfig;
