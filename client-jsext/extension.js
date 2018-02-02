(function(ext) {
    console.log('Boeing');

    // in milliseconds
    var pollInterval = 200;

    // 0 = no debug
    // 1 = low level debug
    // 2 = high - open the floodgates
    // Variable is set by user through a Scratch command block
    var debugLevel = 0;

    var boeingAccessURL = "http://127.0.0.1:8000";

    // a variable to set the color of the 'LED' indicator for the extension on the Scratch editor
    var boeingStatus = 2; //  0:not ready(RED), 1:partially ready or warning(YELLOW), 2: fully ready(GREEN)
    var boeingStatusMessage = "uninitialized";

    var mcp3008  = [[]];
    var mcp3008Last  = [[]];
    var mcp3008Revert  = [[]];


    const GPIOHIGH = 'high', GPIOLOW = 'low', GPIOUNKNOWN = 'unknown';

    // named array indexed by port string to store actual GPIO values (both for input and output ports)
    var gpio = [];

    // named array indexed by port string to store the last GPIO values (for edge detection)
    var gpioLast = [];


    const GPIOMODEUNKNOWN = 'unknown', GPIOMODEPULLUP = 'pull-up', GPIOMODEPULLDOWN = 'pull-down', GPIOMODEPULLDOUT = 'd-out';

    // named array indexed by port string to store GPIO port modes (pull-up/down, dout)
    var gpioMode = [];


    // Cleanup function when the extension is unloaded
    ext._shutdown = function (
        //TODO: code
    ) {};


    // Status reporting code, called by Scratch
    ext._getStatus = function() {
        $.ajax({
            url: boeingAccessURL + '/status',
            dataType: 'text',
            success: function( data ) {
                boeingStatus = 2;
                boeingStatusMessage = data;
            },
            error: function( jqXHR, textStatus, errorThrown ) {
                boeingStatus = 0;
                boeingStatusMessage = textStatus;
            }
        });
        return {status: boeingStatus,
                msg: boeingStatusMessage
                };
    };

    // Periodic communication with the Boeing python daemon, called internally
    ext._poll = function() {
        if ( boeingStatus != 0) {
            $.ajax({
                url: boeingAccessURL + "/poll",
                dataType: 'text',
                success: function( data ) {
                    // parse answer and update own variables
                    var lines = data.split('\n');
                    for(var i = 0;i < lines.length;i++){
                        var elements = lines[i].split(' ');
                        var sensor = elements[0].split('/');
                        switch( sensor[0] ) {
                            case 'mcp3008':     // mcp3008/<spidev>/<channel> <value>
                                mcp3008[sensor[1]][sensor[2]] = Math.round(Math.abs(mcp3008Revert[sensor[1]][sensor[2]] - Number(elements[1])) * 250 / 1023 ) / 250;
                                break;
                            case 'gpio':        // gpio/<port> <value>
                                gpio[sensor[1]] = Number(elements[1]);
                                break;
                        }
                    }
                },
                error: function( jqXHR, textStatus, errorThrown ) {
                    if ( boeingStatus == 2 ) {
                        boeingStatus = 1;
                        boeingStatusMessage = textStatus;
                    }
                }
            });

        }

        // Set next poll period
        setTimeout(ext._poll, pollInterval);
    }


    ///////////////////////
    // MCP3008 functions //
    ///////////////////////

    // Read analog value
    ext.getMCP3008 = function( mcp3008ch, spidev ) {
        //Do not do this extra, wait get last result fro poll:
        //ext._readData("/mcp3008/" + spidev + "/" + mcp3008ch);
        return mcp3008[spidev.toString()][mcp3008ch.toString()];
    }

    // Replace max-min values (useful for reverse inserted sliding potmeters).
    ext.revertMCP3008 = function( mcp3008ch, spidev ) {
        mcp3008Revert[spidev.toString()][mcp3008ch.toString()] = 1023;
    }

    // Check for event
    ext.when_MCP3008changes = function( mcp3008ch, spidev ) {
        if ( mcp3008Last[spidev.toString()][mcp3008ch.toString()] == mcp3008[spidev.toString()][mcp3008ch.toString()] ) {
            return false;
        }

        if ( mcp3008[spidev.toString()][mcp3008ch.toString()] == -1 || mcp3008Last[spidev.toString()][mcp3008ch.toString()] == -1 ) {
            mcp3008Last[spidev.toString()][mcp3008ch.toString()] = mcp3008[spidev.toString()][mcp3008ch.toString()];
            return false;
        }

        mcp3008Last[spidev.toString()][mcp3008ch.toString()] = mcp3008[spidev.toString()][mcp3008ch.toString()];
        return true;
    };


    ///////////////////////
    // GPIO functions    //
    ///////////////////////

    // Init GPIO default TODO:blocking
    ext.initGPIO = function( port, gpioDefault ) {
        switch( gpioDefault ) {
            case 'd-out':
                $.ajax({
                    url: boeingAccessURL + "/setupGpio/" + port + "/" + GPIOMODEPULLDOUT,
                    dataType: 'text',
                    success: function( data ) {
                        gpioMode[ port.toString() ] = GPIOMODEPULLDOUT;
                    },
                    error: function( jqXHR, textStatus, errorThrown ) {
                        if ( boeingStatus == 2 ) {
                            boeingStatus = 1;
                            boeingStatusMessage = textStatus;
                        }
                    }
                });
                break;
            case 'pull-up':
                $.ajax({
                    url: boeingAccessURL + "/setupGpio/" + port + "/" + GPIOMODEPULLUP,
                    dataType: 'text',
                    success: function( data ) {
                        gpioMode[ port.toString() ] = GPIOMODEPULLUP;
                    },
                    error: function( jqXHR, textStatus, errorThrown ) {
                        if ( boeingStatus == 2 ) {
                            boeingStatus = 1;
                            boeingStatusMessage = textStatus;
                        }
                    }
                });
                break;
            case 'pull-down':
                $.ajax({
                    url: boeingAccessURL + "/setupGpio/" + port + "/" + GPIOMODEPULLDOWN,
                    dataType: 'text',
                    success: function( data ) {
                        gpioMode[ port.toString() ] = GPIOMODEPULLDOWN;
                    },
                    error: function( jqXHR, textStatus, errorThrown ) {
                        if ( boeingStatus == 2 ) {
                            boeingStatus = 1;
                            boeingStatusMessage = textStatus;
                        }
                    }
                });
                break;
            default:
                gpioMode[ port.toString() ] = GPIOMODEUNKNOWN;
        }
    }

    // Set digital value
    ext.setGPIO = function( gpiostate, port ) {
        if( gpioMode[port.toString()] == GPIOMODEPULLDOUT) {
            $.ajax({
                url: boeingAccessURL + "/setGpio/" + port + "/" + gpiostate,
                dataType: 'text',
                error: function( jqXHR, textStatus, errorThrown ) {
                    if ( boeingStatus == 2 ) {
                        boeingStatus = 1;
                        boeingStatusMessage = textStatus;
                    }
                }
            });
        }
    }

    // Read digital value
    ext.isGPIO = function( _port, gpiostate ) {
        port = _port.toString();
        if ( gpioMode[port] == GPIOMODEPULLUP || gpioMode[port] == GPIOMODEPULLDOWN) {
            if ( gpiostate == 'low' && gpio[port] == GPIOLOW || gpiostate == 'high' && gpio[port] == GPIOHIGH ) {
                return true;
            } else {
                return false;
            }
        }
        return false;   //TODO: handle unknown state
    }

    // Port mode
    ext.isGPIOMode = function( port, gpioDefault ) {
        if ( gpioMode[port.toString()] == gpioDefault ) {
                return true;
        }
        return false;
    }

    // Check for events
    ext.when_GPIOChanges = function( _port, transition ) {
        port = _port.toString();

        if ( gpioMode[port] == GPIOMODEPULLDOUT || gpioMode[port] == GPIOMODEUNKNOWN) {
            return false;   // Not in input mode
        }

        if ( gpioLast[port] == gpio[port] ) {
            return false;   // Not changed
        }

        if ( gpio[port] == GPIOUNKNOWN || gpioLast[port] == GPIOUNKNOWN ) {
            gpioLast[port] = gpio[port];
            return false;   // In unknown state (at the beginning)
        }

        if( transition == 'rises' && gpio[port] == GPIOHIGH && gpioLast[port] == GPIOLOW ) {
            gpioLast[port] = gpio[port];
            return true;    // Low -> High
        }

        if( transition == 'falls' && gpio[port] == GPIOLOW && gpioLast[port] == GPIOHIGH ) {
            gpioLast[port] = gpio[port];
            return true;    // High -> Low
        }

        return false;
    }

    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            // Block type, block name, function name, param1 default value, param2 default value
            ['', 'v26', 'isGPIOHigh'],
            ['r', 'mcp3008 ch %m.mcp3008ch SPI %m.spidev', 'getMCP3008', 0, 0],
            ['', 'revert mcp3008 ch %m.mcp3008ch SPI %m.spidev', 'revertMCP3008', 0, 0],
            ['h', 'when mcp3008 ch %m.mcp3008ch SPI %m.spidev changes', 'when_MCP3008changes', 0, 0],

            ['', 'init GPIO %d for %m.gpiodefault', 'initGPIO', 0, GPIOMODEPULLDOWN],
            ['', 'set GPIO %d %m.gpiostate', 'setGPIO', 0, 'high'],
            ['b', 'GPIO %d %m.gpiostate?', 'isGPIO', 0, 'low'],
            ['b', 'GPIO %d %m.gpiodefault?', 'isGPIOMode', 0, GPIOMODEPULLDOWN],
            ['h', 'when GPIO %d %m.transition', 'when_GPIOChanges', 0, 'rises'],
        ],
        menus: {
            mcp3008ch: ['0','1','2','3','4','5','6','7'],
            spidev: ['0','1'],
            transition: ['falls', 'rises'],
            gpiodefault: [GPIOMODEPULLDOUT, GPIOMODEPULLDOWN, GPIOMODEPULLUP],
            gpiostate: [GPIOHIGH,GPIOLOW],
        },
        url: 'http://info.scratch.mit.edu/WeDo',
        displayName: 'Boeing'
    };

    // Register the extension
    ScratchExtensions.register('Boeing extension', descriptor, ext);

    //Start polling
    ext._poll();

})({});