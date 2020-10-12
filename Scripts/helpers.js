const extensionConfig = require('./config.js');

function log(message, force) {
    const config = extensionConfig();
    if (nova.inDevMode() || config.log || force) {
        console.log(message);
    }
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

module.exports = {
    log,
    showNotification,
    showActionableNotification,
};
