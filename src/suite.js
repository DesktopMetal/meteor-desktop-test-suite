/* eslint-disable prefer-spread, no-console */
import path from 'path';
import shell from 'shelljs';
import fs from 'fs';
import spawn from 'cross-spawn';
import semver from 'semver';

/**
 * Returns path to electron bin.
 */
export function getElectronPath() {
    let electronPath = path.join(__dirname, '..', '..', '.bin', 'electron');
    if (process.platform === 'win32') electronPath += '.cmd';
    return electronPath;
}

/**
 * Looks for npm.
 * @returns {*}
 */
function getNpm() {
    let execResult;
    let version;
    let version3;
    let npm;
    if (shell.which('npm')) {
        execResult = shell.exec('npm --version', { silent: true });
        if (execResult.code === 0) {
            version = execResult.stdout;
        }
    }

    if (version !== null && semver.satisfies(version, '>= 3.0.0')) {
        npm = 'npm';
    }

    if (!npm) {
        if (shell.which('npm3')) {
            execResult = shell.exec('npm3 --version', { silent: true });
            if (execResult.code === 0) {
                version3 = execResult.stdout;
            }
        }

        if (version3 === null) {
            npm = 'npm';
        } else {
            npm = 'npm3';
        }
    }
    return npm;
}

const npm = getNpm();

/**
 * Creates a test app with the plugin included.
 *
 * @param {string} installPath - path at which to install the app
 * @param {string} pluginName  - name of the npm package (plugin) you are testing
 * @returns {Promise}
 */
export function createTestApp(installPath, pluginName) {
    shell.rm('-rf', installPath);
    shell.mkdir(installPath);
    shell.cp('-rf', path.join(__dirname, '..', 'app', '*'), installPath);
    const packageJson = path.join(installPath, 'package.json');
    const indexJs = path.join(installPath, 'index.js');

    fs.writeFileSync(
        packageJson,
        fs.readFileSync(packageJson, 'UTF-8').replace('{plugin}', pluginName)
    );
    fs.writeFileSync(indexJs, fs.readFileSync(indexJs, 'UTF-8').replace('{plugin}', pluginName));

    return new Promise((resolve) => {
        spawn(npm, ['install'], {
            cwd: path.join(path.resolve(installPath)),
            stdio: 'inherit'
        }).on('exit', () => {
            resolve();
        });
    });
}

/**
 * Sends an IPC message to the main process.
 * !Works only when you do not have an ipcRenderer initiated in the app!
 *
 * @param {Object} app - the app ref from Spectron
 * @param {...*}  args - array of arguments to pass to ipc.send
 * @returns {Promise}
 */
export function sendIpc(app, ...args) {
    return app.electron.ipcRenderer.send.apply(app.electron.ipcRenderer, args);
}
export function sendIpcSync(app, ...args) {
    return app.electron.ipcRenderer.sendSync.apply(app.electron.ipcRenderer, args);
}

/**
 * Sends an IPC event to your module.
 *
 * @param {Object} app    - app ref from Spectron
 * @param {string} module - module name your plugin is registering
 * @param {string} event  - event from your module
 * @param {...*} args     - array of arguments to pass to ipc.send
 * @returns {Promise}
 */
export function send(app, module, event, ...args) {
    args.unshift(`${module}__${event}`);
    return app.electron.ipcRenderer.send.apply(app.electron.ipcRenderer, args);
}

/**
 * Sends an IPC event and waits for an another IPC event to come.
 * @param {Object} app              - app ref from Spectron
 * @param {string} eventToSend      - name of the ipc event to send
 * @param {string} eventToListenFor - ipc event to listen for
 * @param {...*}   eventArgs        - arguments to pass with the event
 * @returns {Promise}
 */
export function sendIpcAndWaitForResponse(app, eventToSend, eventToListenFor, ...eventArgs) {
    /* eslint-disable */
    return app.client.executeAsync(function ($requireName, $eventToSend, $eventArgs, $eventToListenFor, done) {
        const ipc = window[$requireName]('electron').ipcRenderer;
        ipc.once($eventToListenFor, function eventCallback() {
            done(Array.prototype.slice.call(arguments));
        });
        $eventArgs.unshift($eventToSend);
        ipc.send.apply(ipc, $eventArgs);
    }, app.api.requireName, eventToSend, eventArgs, eventToListenFor);
    /* eslint-enable */
}

/**
 * Fires an event on the events bus.
 * @param {Object} app         - app ref from Spectron
 * @param {string} eventToFire - name of the event to fire
 * @param {...*}   eventArgs   - arguments to pass with the event
 * @returns {Promise}
 */
export function fireEventsBusEvent(app, eventToFire, ...eventArgs) {
    return sendIpcSync(app, 'fireEventsBusEvent', eventToFire, ...eventArgs);
}

/**
 * Fires an event on the events bus and then waits for an another event to be emitted.
 * @param {Object} app              - app ref from Spectron
 * @param {string} eventToFire      - name of the event to fire
 * @param {string} eventToListenFor - event to listen for on the events bus
 * @param {...*}   eventArgs        - arguments to pass with the event
 * @return {Promise}
 */
export function fireEventsBusEventAndWaitForAnother(
    app, eventToFire, eventToListenFor, ...eventArgs
) {
    return sendIpcSync(app, 'listenToEventOnEventBus', eventToListenFor)
        .then(() => sendIpcAndWaitForResponse(app, 'fireEventsBusEvent', `eventsBusEvent_${eventToListenFor}`, eventToFire, ...eventArgs));
}

/**
 * Instantiates your plugin.
 * @param {Object} app - app ref from Spectron
 * @param {...*}  args - args to your plugin constructor
 */
export function constructPlugin(app, ...args) {
    return sendIpcSync(app, 'constructPlugin', ...args);
}


/**
 * Wait for a specified ipc event.
 * @param {Object} app             - app ref from Spectron
 * @param {string} eventToListenFor - name of the event to listen for
 * @return {Promise}
 */
export function waitForIpc(app, eventToListenFor) {
    /* eslint-disable */
    return app.client.executeAsync(function ($requireName, $eventToListenTo, done) {
        const ipc = window[$requireName]('electron').ipcRenderer;
        ipc.once($eventToListenTo, function eventCallback() {
            done(Array.prototype.slice.call(arguments));
        });
    }, app.api.requireName, eventToListenFor);
    /* eslint-enable */
}

export function waitForEventsBusEvent(app, eventToListenFor) {
    return sendIpcSync(app, 'listenToEventOnEventBus', eventToListenFor).then(
        () => waitForIpc(app, `eventBusEvent_${eventToListenFor}`)
    );
}


let fetchCallCounter = 0;

/**
 * Fetches some data from main process by sending an IPC event and waiting for a response.
 * @param {Object} app    - app ref from Spectron
 * @param {string} module - module name your plugin is registering
 * @param {string} event  - event from your module
 * @param {...*}   args   - array of arguments to pass to ipc.send
 * @return {Promise}
 */
export function fetch(app, module, event, ...args) {
    return new Promise((resolve, reject) => {
        if (fetchCallCounter === Number.MAX_SAFE_INTEGER) {
            fetchCallCounter = 0;
        }
        fetchCallCounter += 1;
        const fetchId = fetchCallCounter;
        sendIpcAndWaitForResponse(app,
            `${module}__${event}`,
            `${module}__${event}___response`,
            fetchId, ...args)
            .then((result) => {
                if (result.value) {
                    if (result.value[1] === fetchId) {
                        resolve(result.value);
                    } else {
                        reject('wrong fetchId in the ipc response');
                    }
                }
            })
            .catch(e => reject(e));
    });
}

export class Logger {
    constructor(show, showErrors) {
        this.show = show;
        this.showErrors = showErrors;
        this.loggers = {
            get: () => new Logger(show, showErrors)
        };
    }

    info(...args) {
        if (this.show) {
            console.log(...args);
        }
    }

    verbose(...args) {
        if (this.show) {
            console.log(...args);
        }
    }

    debug(...args) {
        if (this.show) {
            console.log(...args);
        }
    }

    warn(...args) {
        if (this.show) {
            console.warn(...args);
        }
    }

    error(...args) {
        if (this.show || this.showErrors) {
            console.error(...args);
        }
    }

    getLoggerFor() {
        return new Logger(this.show, this.showErrors);
    }
}

module.exports = {
    getElectronPath,
    constructPlugin,
    sendIpc,
    sendIpcSync,
    createTestApp,
    send,
    fireEventsBusEvent,
    fireEventsBusEventAndWaitForAnother,
    waitForIpc,
    waitForEventsBusEvent,
    fetch,
    sendIpcAndWaitForResponse,
    Logger
};
