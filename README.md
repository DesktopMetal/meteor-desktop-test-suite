## Meteor Desktop test suite

Few utils to ease out functional testing of Meteor Desktop modules/plugins.
Take a look at the examples at the bottom of this readme to actually see how you can use this.

### `createTestApp(installPath, pluginName)`
Creates a test app with plugin you are testing included. Plugin is installed by `npm`.
```javascript
/**
 * @param {string} installPath - path at which to install the app
 * @param {string} pluginName  - name of the npm package (plugin) you are testing
 * @returns {Promise}
 */
```

### `constructPlugin(app, log, app, appSettings, eventsBus, modules, settings, Module)`
It is instantiating your plugin. You can supply mocks for any params your plugin would normally receive from the skeleton app.
Pass `undefined` if your plugin does not use certain param or if you want to use some defaults provided by this test suite. Check [here](https://github.com/wojtkowiak/meteor-desktop-plugin-test-suite/blob/master/app/index.js#L89) to see what is passed by default.

### `fireEventsBusEvent(app, eventToFire, ...eventArgs)`
Fires an event on the events bus, so you can simulate for example a system event on which you plugin is listening.   
```javascript
/**
 * @param {Object} app         - app ref from Spectron
 * @param {string} eventToFire - name of the event to fire
 * @param {...*}   eventArgs   - arguments to pass with the event
 * @returns {Promise}
 */
```

### `send(app, module, event, ...args)`
Sends an IPC event to your module. Equivalent of `Desktop.send`.
```javascript
/**
 * @param {Object} app    - app ref from Spectron
 * @param {string} module - module name your plugin is registering
 * @param {string} event  - event from your module
 * @param {...*}   args   - array of arguments to pass to ipc.send
 * @returns {Promise}
 */
```

### `fetch(app, module, event, ...args)`
Fetches some data from main process by sending an IPC event and waiting for the response.
Equivalent of `Desktop.fetch`. Promise will resolve to an array with payload that came with the response. 
```javascript
/**
 * @param {Object} app    - app ref from Spectron
 * @param {string} module - module name your plugin is registering
 * @param {string} event  - event from your module
 * @param {...*}   args   - array of arguments to pass to ipc.send
 * @return {Promise}
 */
 ```

### `fireEventsBusEventAndWaitForAnother(app, eventToFire, eventToListenFor, ...eventArgs)`
Fires an event on the events bus and then waits for an another event to be emitted. Useful for example when your plugin is doing some stuff on `afterLoading` event and signalizes readiness via another event.  
```javascript
/**
 * @param {Object} app              - app ref from Spectron
 * @param {string} eventToFire      - name of the event to fire
 * @param {string} eventToListenFor - event to listen for on the events bus
 * @param {...*}   eventArgs        - arguments to pass with the event
 * @return {Promise}
 */
 ```

### `sendIpc(app, ...args)`
Sends an IPC message to the main process.
```javascript
/**
 * @param {Object} app - the app ref from Spectron
 * @param {...*}  args - array of arguments to pass to ipc.send
 * @returns {Promise}
 */
```
### `sendIpcSync(app, ...args)`
Same as above but sync. However also returns a `Promise` as it is transferred through chromedriver.

### `sendIpcAndWaitForResponse(app, eventToSend, eventToListenFor, ...eventArgs)`
Sends an IPC event and waits for an another IPC event to come.
```javascript
/**
 * @param {Object} app              - app ref from Spectron
 * @param {string} eventToSend      - name of the ipc event to send
 * @param {string} eventToListenFor - ipc event to listen for
 * @param {...*}   eventArgs        - arguments to pass with the event
 * @returns {Promise}
 */
```

### `emitWindowCreated(app)`
Makes the app emit `windowCreated` event.
```javascript
/**
 * @param {Object} app - the app ref from Spectron
 * @returns {Promise}
 */
```

### `class Logger(show, showErrors)`
Fake logger that eventually can write the logs to the console. You can set `show` to `false` and `showErrors` to `true` to only see errors passed to it. 

## Examples

An example of usage in tests is here [meteor-desktop-splash-screen](https://github.com/wojtkowiak/meteor-desktop-splash-screen/blob/master/tests/functional/test.js) and here [meteor-desktop-localstorage](https://github.com/wojtkowiak/meteor-desktop-localstorage/blob/master/tests/functional/test.js).
