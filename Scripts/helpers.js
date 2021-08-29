const extensionConfig = require('./config.js');

function log(message, force) {
    const config = extensionConfig();
    if (nova.inDevMode() || config.log || force) {
        if (typeof message == 'object') {
            message = JSON.stringify(message, null, ' ');
        }
        console.log(message);
    }
}

function stringToObject(str) {
    if (!str) {
        return {};
    }

    const rulesLines = str.split('\n');
    const rulesObj = {};

    rulesLines.forEach((ruleLine) => {
        ruleLine = ruleLine.trim();

        if (ruleLine == '{' || ruleLine == '}') {
            return;
        }

        let ruleName = ruleLine.substring(0, ruleLine.indexOf(':')).trim();
        let ruleValue = ruleLine.substring(ruleLine.indexOf(':') + 1).trim();

        if (ruleValue.startsWith('[') && ruleValue.endsWith(']')) {
            ruleValue = ruleValue.replace('[', '').replace(']', '');
            ruleValue = ruleValue.replace(/, '/g, ',');
            ruleValue = ruleValue.replace(/, "/g, ',');
            ruleValue = ruleValue.replace(/'/g, '');
            ruleValue = ruleValue.replace(/"/g, '');
            ruleValue = ruleValue.trim().split(',');
        } else if (ruleValue.includes('{') && ruleValue.includes('}')) {
            ruleValue = JSON.parse(ruleValue);
        }

        ruleName = ruleName.replace(/"/g, '');
        ruleName = ruleName.replace(/'/g, '');

        ruleValue = ruleValue == 'true' ? true : ruleValue;
        ruleValue = ruleValue == 'false' ? false : ruleValue;
        ruleValue = isNumeric(ruleValue) ? parseInt(ruleValue) : ruleValue;
        rulesObj[ruleName] = ruleValue;
    });

    return rulesObj;
}

function adjustSpacesLength(text, from = 4, spaces) {
    const lines = text.split('\n');
    spaces = parseInt(spaces);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const leadingSpaces = /^\s*/.exec(line)[0];

        if (leadingSpaces) {
            const replace = '[ ]{' + from + '}|\t';
            const re = new RegExp(replace, 'g');
            //const newLeadingSpaces = leadingSpaces.replace(/[ ]{4}|\t/g, ' '.repeat(spaces));
            const newLeadingSpaces = leadingSpaces.replace(re, ' '.repeat(spaces));
            lines[i] = newLeadingSpaces + line.replace(/^\s+/, '');
        }
    }
    return lines.join('\n');
}

function spacesToTabs(str, spaceNo = 4) {
    if (typeof str !== 'string') {
        return str;
    }

    var spaces = '';
    for (var i = 0; i < spaceNo; i++) {
        spaces += ' ';
    }
    var reg = new RegExp(spaces, 'g');
    str = str.replace(reg, '\t');
    return str;
}

function tabsToSpaces(data, tabSize = 4) {
    if (typeof data !== 'string') {
        return data;
    }

    tabSize = parseInt(tabSize);

    let charIndex = data.indexOf('\t');
    const newLineIndex = data.substr(0, charIndex).lastIndexOf('\n');

    if (charIndex === -1) {
        return data;
    }

    charIndex -= newLineIndex > 0 ? newLineIndex : 0;
    let buffer = charIndex % tabSize;

    if (charIndex < tabSize) {
        buffer = charIndex;
    } else if (charIndex === tabSize) {
        buffer = 0;
    }

    /**
     * Converting tab character to appropriate number of spaces
     */
    while (charIndex < data.length) {
        if (data[charIndex] === '\t') {
            data = data.replace(data[charIndex], ' '.repeat(tabSize - buffer));
            charIndex += tabSize - buffer;
            buffer = 0;
            continue;
        } else {
            buffer++;
        }

        if (buffer >= tabSize || data[charIndex] === '\n') {
            buffer = 0;
        }
        charIndex++;
    }

    return data;
}

function indentLines(before, text, indentChar, indentSize) {
    let indentMore = false;
    let prevprocessedLineWhiteSpace = -1;

    indentSize = parseInt(indentSize);

    const lines = text.split('\n');

    lines.forEach((line, index) => {
        let space = before;
        let currentline = line.trim();

        if (currentline !== '') {
            if (prevprocessedLineWhiteSpace < 0) {
                prevprocessedLineWhiteSpace = 0;
            }

            if (indentMore) {
                space = space + ' '.repeat(indentSize);
            }

            if (currentline.startsWith('<script')) {
                indentMore = true;
            }

            if (currentline.startsWith('</script')) {
                space = before;
                indentMore = false;
            }

            let lineCleanIndent = 0;
            for (var i = 0; i < line.length; i++) {
                let charIs = line.charAt(i);
                if (charIs !== ' ') {
                    break;
                }
                lineCleanIndent = lineCleanIndent + 1;
            }

            let isClosingLine = false;

            if (currentline.startsWith('}')) {
                isClosingLine = true;
            }

            if (isClosingLine) {
                console.log('this is a closing line', currentline);
                console.log('Indent is', prevprocessedLineWhiteSpace, lineCleanIndent);
                lines[index] = space + currentline;
                prevprocessedLineWhiteSpace = lineCleanIndent;
            } else {
                console.log('line: ', line, lineCleanIndent, prevprocessedLineWhiteSpace);
                if (lineCleanIndent > prevprocessedLineWhiteSpace + indentSize) {
                    line = ' '.repeat(prevprocessedLineWhiteSpace + indentSize) + currentline;
                    prevprocessedLineWhiteSpace = prevprocessedLineWhiteSpace + indentSize;
                } else {
                    prevprocessedLineWhiteSpace = lineCleanIndent;
                }
            }

            lines[index] = space + line;
        }
    });
    return lines.join('\n');
}

function showNotification(id, title, body) {
    let request = new NotificationRequest(id);

    request.title = nova.localize(title);
    request.body = nova.localize(body);
    request.actions = [nova.localize('OK')];

    nova.notifications.add(request).catch((err) => console.error(err, err.stack));
}

function showActionableNotification(id, title, body, actions, callback) {
    let request = new NotificationRequest(id);

    request.title = nova.localize(title);
    request.body = nova.localize(body);
    request.actions = actions.map((action) => nova.localize(action));

    nova.notifications
        .add(request)
        .then((response) => callback(response.actionIdx))
        .catch((err) => console.error(err, err.stack));
}

function cleanDirectory(folderPath, extension = '') {
    try {
        const filesInDir = nova.fs.listdir(folderPath);

        filesInDir.forEach((file) => {
            const filePath = nova.path.join(folderPath, file);
            nova.fs.remove(filePath);
        });
    } catch (error) {
        console.error(error);
    }
}

function isNumeric(str) {
    if (typeof str != 'string') return false; // we only process strings!
    return (
        !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
        !isNaN(parseFloat(str))
    ); // ...and ensure strings of whitespace fail
}

module.exports = {
    log,
    stringToObject,
    adjustSpacesLength,
    spacesToTabs,
    tabsToSpaces,
    indentLines,
    showNotification,
    showActionableNotification,
    cleanDirectory
};
