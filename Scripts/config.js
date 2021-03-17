const options = {
    phppath: '',
    csfixerpath: '',
    port: '',
    server: '',
    log: '',
    standard: '',
    rules: '',
    phpcsconfig: '',
    onsave: '',
    ignoreremote: '',
    phpRespectNova: '',
    phpUseTabs: '',
    phpTabWidth: '',
    htmltry: '',
    htmladditional: '',
    htmlrules: '',
    twig: '',
    twigRespectNova: false,
    twigUseTabs: false,
    twigTabWidth: 4,
    twigrules: '',
    blade: '',
    bladeRespectNova: false,
    bladeUseTabs: false,
    bladeTabWidth: 4,
    bladerules: ''
};

let cachedOptions = false;
let observing = false;

function getGlobalConfig() {
    let extOptions = {};
    for (const key in options) {
        if (options.hasOwnProperty(key)) {
            const optionID = nova.extension.identifier + '.' + key;
            const opt = nova.config.get(optionID);
            extOptions[key] = opt;
        }
    }

    return extOptions;
}

function getWordspaceConfig() {
    let worksapceOptions = {};

    if (nova.workspace.config.get(nova.extension.identifier + '.workspaceconfigenable') == 'disable') {
        return worksapceOptions;
    }

    for (const key in options) {
        const optionID = nova.extension.identifier + '.' + key;
        const opt = nova.workspace.config.get(optionID);

        if (typeof opt !== 'object') {
            worksapceOptions[key] = opt;
        }
    }

    return worksapceOptions;
}

function observeOptionChange(options) {
    if (observing) {
        return false;
    }

    for (const key in options) {
        const optionID = nova.extension.identifier + '.' + key;
        nova.config.onDidChange(optionID, (val) => {
            reloadExtensionConfig(options);
        });

        nova.workspace.config.onDidChange(optionID, (val) => {
            reloadExtensionConfig(options);
        });
    }

    nova.workspace.config.onDidChange(nova.extension.identifier + '.workspaceconfigenable', (val) => {
        reloadExtensionConfig(options);
    });

    observing = true;
}

function reloadExtensionConfig(options) {
    let config = getGlobalConfig();
    let workspaceOptions = getWordspaceConfig();

    let newOptions = Object.assign({}, config, workspaceOptions);

    for (const key in newOptions) {
        options[key] = newOptions[key];
    }
}

function extensionConfig() {
    if (cachedOptions) {
        return cachedOptions;
    }

    let config = getGlobalConfig();
    let workspaceOptions = getWordspaceConfig();

    config = Object.assign({}, config, workspaceOptions);
    cachedOptions = config;

    observeOptionChange(config);

    return config;
}

module.exports = extensionConfig;
