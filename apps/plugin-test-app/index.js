/* eslint-disable import/no-unresolved, no-param-reassign, no-console */
const electron = require('electron');
const PluginUnderTest = require('{plugin}').default; // This is replaced while a copy of this app is made.
const ipcMain = require('electron').ipcMain;
const Events = require('events').EventEmitter;
const fs = require('fs');
const path = require('path');

const { app, BrowserWindow } = electron;
const eventsBus = new Events();
const Module = require('./module');

let plugin; // eslint-disable-line no-unused-vars

const logFile = fs.openSync('log.txt', 'w');

function saveLog(...args) {
    args = args.map(arg => `${arg}`);
    fs.writeSync(logFile, `${args.join(' ')}\n`, 'utf-8');
}

const {
    debug, log, warn, error
} = console;

console.log = (...args) => {
    saveLog(...args);
    log(...args);
};
console.warn = (...args) => {
    saveLog(...args);
    warn(...args);
};
console.error = (...args) => {
    saveLog(...args);
    error(...args);
};
console.debug = (...args) => {
    saveLog(...args);
    debug(...args);
};


class Logger {
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

process.on('uncaughtException', (error) => {
    console.log(error);
    fs.writeFileSync(
        path.join(__dirname, 'error.txt'),
        JSON.stringify(error.stack, null, 2).replace(/\\n/gmi, '\n'));
    app.quit();
});

let mainWindow = null;
let sender = null;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        x: 1,
        y: 1,
        width: 1,
        height: 1
    });

    mainWindow.loadURL(`file://${__dirname}/index.html`);

    mainWindow.on('closed', () => (mainWindow = null));
});

const skeletonAppMock = {
    removeUncaughtExceptionListener: () => {
    }
};

ipcMain.on('emitWindowCreated', (event) => {
    eventsBus.emit('windowCreated', mainWindow);
    event.returnValue = true;
});

ipcMain.on(
    'constructPlugin',
    (event, ...args) => {
        console.log('constructing plugin');
        sender = event.sender;
        args = args.map(arg => ((arg === null) ? undefined : arg));
        const [$log = new Logger(false, false),
            $skeletonApp = skeletonAppMock,
            $appSettings = {},
            $eventsBus = eventsBus,
            $modules = {},
            $settings = {},
            $Module = Module] = args;

        plugin = new PluginUnderTest({
            log: $log,
            skeletonApp: $skeletonApp,
            appSettings: $appSettings,
            eventsBus: $eventsBus,
            modules: $modules,
            settings: $settings,
            Module: $Module
        });
        event.returnValue = true;
    }
);

ipcMain.on('fireEventsBusEvent', (event, eventsBusEvent, ...args) => {
    console.log(`fire events bus event: ${eventsBusEvent}`);
    sender = event.sender;
    console.log(`emitting ${eventsBusEvent} to the events bus`);
    eventsBus.emit(eventsBusEvent, ...args);
    event.returnValue = true;
});

ipcMain.on('listenToEventOnEventBus', (event, eventsBusEvent) => {
    sender = event.sender;
    console.log(`will listen for ${eventsBusEvent} on events bus`);
    eventsBus.on(eventsBusEvent, (...args) => {
        console.log(`received ${eventsBusEvent}, resending as ipc eventsBusEvent_${eventsBusEvent}`);
        sender.send(`eventsBusEvent_${eventsBusEvent}`, ...args);
    });
    event.returnValue = true;
});

app.on('window-all-closed', () => {
    fs.closeSync(logFile);
    app.quit();
});

console.log('test app start');
