(function (ext) {
    console.log('Loading Cardplane HW');

    let poller = null;
    let pollInterval = 200;                                 // how often query sensor's values (in milliseconds)
    let serverAccessURL = "http://192.168.2.9:8000";


    // a variable to set the color of the 'LED' indicator for the extension on the Scratch editor
    const STATUSRED = 0, STATUSYELLOW = 1, STATUSGREEN = 2; //  0:not ready(RED), 1:partially ready or warning(YELLOW), 2: fully ready(GREEN)
    let status = STATUSGREEN;
    let statusMessage = "Uninitialized";


    // Status reporting code, called by Scratch
    ext._getStatus = function () {
        $.ajax({
            url: serverAccessURL + '/status',
            dataType: 'text',
            success: function (data) {
                status = STATUSGREEN;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                ext._setStatus(STATUSRED, textStatus);
            }
        });
        return {
            status: status,
            msg: statusMessage
        };
    };

    let d = new Date();

    ext._setStatus = function (stat, message = "") {
        status = stat;
        if (stat !== STATUSGREEN && message !== "") {
            statusMessage = d.toISOString() + " " + message;
        }
    };


    ///////////////////////
    // MCP3008 functions //
    ///////////////////////

    // named array indexed by channel string to store actual mcp3008 values (faster than sending HTTP requests)
    let mcp3008 = [-1, -1, -1, -1, -1, -1, -1, -1];

    // named array indexed by channel string to store the last mcp3008 values (for edge detection)
    let mcp3008Last = [-1, -1, -1, -1, -1, -1, -1, -1];

    // named array indexed by channel string to mark mcp3008 channels to revert
    let mcp3008Revert = [0, 0, 0, 0, 0, 0, 0, 0];

    // Read analog value
    ext.getMCP3008 = function (ch) {
        if (ch < 0 || ch > 7) {
            ext._setStatus(STATUSYELLOW, "Invalid MCP3008 channel '" + ch.toString() + "'");
            return -1;
        }
        return mcp3008[ch];
    };

    // Switch max-min values (useful for reverse inserted sliding potmeters).
    ext.revertMCP3008 = function (ch) {
        if (ch < 0 || ch > 7) {
            ext._setStatus(STATUSYELLOW, "Invalid MCP3008 channel '" + ch.toString() + "'");
            return;
        }
        mcp3008Revert[ch] = 1023;
    };

    // Check for event
    ext.when_MCP3008changes = function (ch) {
        if (ch < 0 || ch > 7) {
            ext._setStatus(STATUSYELLOW, "Invalid MCP3008 channel '" + ch.toString() + "'");
            return false;
        }

        if (mcp3008[ch] === -1 || mcp3008Last[ch] === -1) {
            mcp3008Last[ch] = mcp3008[ch];
            return false;
        }

        if (mcp3008Last[ch] === mcp3008[ch]) {
            return false;
        }

        mcp3008Last[ch] = mcp3008[ch];
        return true;
    };


    ///////////////////////
    // GPIO functions    //
    ///////////////////////

    const GPIOHIGH = 'high', GPIOLOW = 'low', GPIOFALLS = 'falls', GPIORISES = 'rises', GPIOCHANGES = 'changes', GPIOUNKNOWN = 'unknown';

    // named array indexed by port string to store actual GPIO values (both for input and output ports)
    let gpio = [GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN];

    // named array indexed by port string to store the last GPIO values (for edge detection)
    let gpioLast = [GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN, GPIOUNKNOWN];

    const GPIOMODEUNKNOWN = 'unknown', GPIOMODEPULLUP = 'pull-up', GPIOMODEPULLDOWN = 'pull-down',
        GPIOMODEDOUT = 'd-out';

    // named array indexed by port string to store GPIO port modes (pull-up/down, dout)
    let gpioMode = [GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN, GPIOMODEUNKNOWN];

    // Init GPIO default TODO:blocking
    ext.initGPIO = function (port, gpioDefault) {
        if (port < 2 || port > 26) {
            ext._setStatus(STATUSYELLOW, "Invalid GPIO port '" + port.toString() + "'");
            return false;
        }

        switch (gpioDefault) {
            case GPIOMODEDOUT:
                $.ajax({
                    url: serverAccessURL + "/setupGpio/" + port.toString() + "/" + GPIOMODEDOUT,
                    dataType: 'text',
                    success: function (data) {
                        gpioMode[port] = gpioDefault;
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        ext._setStatus(STATUSYELLOW, textStatus)
                    }
                });
                break;

            case GPIOMODEPULLUP:
                $.ajax({
                    url: serverAccessURL + "/setupGpio/" + port.toString() + "/" + GPIOMODEPULLUP,
                    dataType: 'text',
                    success: function (data) {
                        gpioMode[port] = gpioDefault;
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        ext._setStatus(STATUSYELLOW, textStatus)
                    }
                });
                break;

            case GPIOMODEPULLDOWN:
                $.ajax({
                    url: serverAccessURL + "/setupGpio/" + port.toString() + "/" + GPIOMODEPULLDOWN,
                    dataType: 'text',
                    success: function (data) {
                        gpioMode[port] = gpioDefault;
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        ext._setStatus(STATUSYELLOW, textStatus)
                    }
                });
                break;

            default:
                gpioMode[port] = GPIOMODEUNKNOWN;
                ext._setStatus(STATUSYELLOW, "Unknown GPIO port mode '" + gpioDefault + "'")
        }
    };

    // Set digital value
    ext.setGPIO = function (port, gpiostate) {
        if (port < 2 || port > 26) {
            ext._setStatus(STATUSYELLOW, "Invalid GPIO port '" + port.toString() + "'");
            return;
        }

        if (gpioMode[port] !== GPIOMODEDOUT) {
            ext._setStatus(STATUSYELLOW, "GPIO port '" + port.toString() + "' in '" + gpioMode[port] + "' mode");
            return;
        }

        $.ajax({
            url: serverAccessURL + "/setGpio/" + port.toString() + "/" + gpiostate,
            dataType: 'text',
            error: function (jqXHR, textStatus, errorThrown) {
                ext._setStatus(STATUSYELLOW, textStatus)
            }
        });
    };

    // Read digital value
    ext.isGPIO = function (port, gpiostate) {
        if (port < 2 || port > 26) {
            ext._setStatus(STATUSYELLOW, "Invalid GPIO port '" + port.toString() + "'");
            return;
        }

        if (gpioMode[port] === GPIOMODEPULLUP || gpioMode[port] === GPIOMODEPULLDOWN) {
            return gpiostate === GPIOLOW && gpio[port] === GPIOLOW || gpiostate === GPIOHIGH && gpio[port] === GPIOHIGH;
        }

        ext._setStatus(STATUSYELLOW, "GPIO port is in '" + gpioMode[port] + "' mode");
        return false;
    };

    // Port mode
    ext.isGPIOMode = function (port, gpioDefault) {
        if (port < 2 || port > 26) {
            ext._setStatus(STATUSYELLOW, "Invalid GPIO port '" + port.toString() + "'");
            return;
        }

        return gpioMode[port] === gpioDefault;
    };

    // Check for events
    ext.whenGPIOChanges = function (port, transition) {
        if (port < 2 || port > 26) {
            ext._setStatus(STATUSYELLOW, "Invalid GPIO port '" + port.toString() + "'");
            return;
        }

        if (gpioMode[port] === GPIOMODEPULLUP || gpioMode[port] === GPIOMODEPULLDOWN) {

            if (gpio[port] === GPIOUNKNOWN || gpioLast[port] === GPIOUNKNOWN) {
                gpioLast[port] = gpio[port];
                return false;   // in unknown state (at the beginning, update!)
            }

            if (gpioLast[port] === gpio[port]) {
                return false;   // not changed
            }

            if (transition === GPIOCHANGES && gpio[port] !== gpioLast[port]) {
                gpioLast[port] = gpio[port];
                return true;    // changed
            }

            if (transition === GPIORISES && gpio[port] === GPIOHIGH && gpioLast[port] === GPIOLOW) {
                gpioLast[port] = gpio[port];
                return true;    // rises
            }

            if (transition === GPIOFALLS && gpio[port] === GPIOLOW && gpioLast[port] === GPIOHIGH) {
                gpioLast[port] = gpio[port];
                return true;    // falls
            }
        }

        return false;           // not in input mode
    };


    //////////////////////////
    // TLC5947 functions    //
    //////////////////////////

    // Set digital value
    ext.setTLC5947 = function (ch, value) {
        if (ch < 0 || ch > 23) {
            ext._setStatus(STATUSYELLOW, "Invalid TLC5947 ch '" + ch.toString() + "'");
            return;
        }

        if (value < 0 || value > 1) {
            ext._setStatus(STATUSYELLOW, "Invalid TLC5947 value '" + value.toString() + "'");
            return;
        }

        $.ajax({
            url: serverAccessURL + "/setTLC5947/" + ch.toString() + "/" + Math.round(value * 4095),
            dataType: 'text',
            error: function (jqXHR, textStatus, errorThrown) {
                if (status === STATUSGREEN) {
                    status = STATUSYELLOW;
                    statusMessage = "Last message: " + textStatus;
                }
            }
        });
    };


    // Periodic communication with the Boeing python daemon, called internally
    poller = setInterval(
        function () {
            if (status !== STATUSRED) {
                $.ajax({
                    url: serverAccessURL + "/poll",
                    dataType: 'text',
                    success: function (data) {
                        // parse answer and update own variables
                        let lines = data.split('\n');
                        for (let i = 0; i < lines.length; i++) {
                            let elements = lines[i].split(' ');
                            let sensor = elements[0].split('/');
                            switch (sensor[0]) {
                                case 'mcp3008':     // mcp3008/<channel> <value>  (values are mapped to 0..1 range)
                                    mcp3008[Number(sensor[1])] = Math.round(Math.abs(mcp3008Revert[Number(sensor[1])] - Number(elements[1])) * 250 / 1023) / 250;
                                    break;
                                case 'gpio':        // gpio/<port> <value>
                                    gpio[Number(sensor[1])] = elements[1];
                                    break;
                            }
                        }
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        ext._setStatus(STATUSYELLOW, textStatus)
                    }
                });

            }

        }, pollInterval);

    // Cleanup function when the extension is unloaded
    ext._shutdown = function () {
        if (poller) poller = clearInterval(poller);
        for (let ch = 0; ch < 24; ch++)
            setTLC5947(ch,0);

        //TODO: howto clean GPIO ports?
    };

    // Block and block menu descriptions
    let descriptor = {
        blocks: [
            // Block type, block name, function name, param1 default value, param2 default value
            [' ', 'v33', 'isGPIOHigh'],
            ['r', 'mcp3008 ch %m.mcp3008ch', 'getMCP3008', 0],
            [' ', 'revert mcp3008 ch %m.mcp3008ch', 'revertMCP3008', 0],
            ['h', 'when mcp3008 ch %m.mcp3008ch changes', 'when_MCP3008changes', 0],

            [' ', 'init GPIO %n for %m.gpiodefault', 'initGPIO', 0, GPIOMODEPULLDOWN],
            [' ', 'set GPIO %n to %m.gpiostate', 'setGPIO', 0, GPIOHIGH],
            ['b', 'GPIO %n %m.gpiostate?', 'isGPIO', 0, GPIOLOW],
            ['b', 'GPIO %n %m.gpiodefault?', 'isGPIOMode', 0, GPIOMODEPULLDOWN],
            ['h', 'when GPIO %n %m.transition', 'whenGPIOChanges', 0, GPIORISES],

            [' ', 'set TLC5947 %n to %n', 'setTLC5947', 0, 1],
        ],
        menus: {
            mcp3008ch: [0, 1, 2, 3, 4, 5, 6, 7],
            transition: [GPIOFALLS, GPIORISES, GPIOCHANGES],
            gpiodefault: [GPIOMODEDOUT, GPIOMODEPULLDOWN, GPIOMODEPULLUP],
            gpiostate: [GPIOHIGH, GPIOLOW],
        },
        url: 'https://github.com/jursonovicst/scratch-rpi-boeing',
        displayName: 'Cardplane HW'
    };

    // Register the extension
    ScratchExtensions.register('Cardplane HW', descriptor, ext);

    //Start polling
    ext._poll();

})({});