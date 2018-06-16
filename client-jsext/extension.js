(function(ext) {
    console.log('Boeing');

    // in milliseconds
    var pollInterval = 200;

    // 0 = no debug
    // 1 = low level debug
    // 2 = high - open the floodgates
    // Variable is set by user through a Scratch command block
    var debugLevel = 0;

    var boeingAccessURL = "http://192.168.2.9:8000";

    // a variable to set the color of the 'LED' indicator for the extension on the Scratch editor
    var boeingStatus = 2; //  0:not ready(RED), 1:partially ready or warning(YELLOW), 2: fully ready(GREEN)
    var boeingStatusMessage = "uninitialized";



    // named array indexed by channel string to store actual mcp3008 values
    var mcp3008  = [-1,-1,-1,-1,-1,-1,-1,-1];

    // named array indexed by channel string to store the last mcp3008 values (for edge detection)
    var mcp3008Last  = [-1,-1,-1,-1,-1,-1,-1,-1];

    // named array indexed by channel string to mark mcp3008 channels to revert
    var mcp3008Revert  = [0,0,0,0,0,0,0,0];



    const GPIOHIGH = 'high', GPIOLOW = 'low', GPIOFALLS='falls', GPIORISES='rises', GPIOUNKNOWN = 'unknown';

    // named array indexed by port string to store actual GPIO values (both for input and output ports)
    var gpio = [];

    // named array indexed by port string to store the last GPIO values (for edge detection)
    var gpioLast = [];

    const GPIOMODEUNKNOWN = 'unknown', GPIOMODEPULLUP = 'pull-up', GPIOMODEPULLDOWN = 'pull-down', GPIOMODEDOUT = 'd-out';

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
                            case 'mcp3008':     // mcp3008/<channel> <value>  (values are mapped to 0..1 range)
                                mcp3008[sensor[1]] = Math.round(Math.abs(mcp3008Revert[sensor[1]] - Number(elements[1])) * 250 / 1023 ) / 250;
                                break;
                            case 'gpio':        // gpio/<port> <value>
                                gpio[Number(sensor[1])] = Number(elements[1]);
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
    ext.getMCP3008 = function( ch ) {
        //Do not do this extra, wait get last result fro poll:
        return mcp3008[ch.toString()];
    }

    // Switch max-min values (useful for reverse inserted sliding potmeters).
    ext.revertMCP3008 = function( ch ) {
        mcp3008Revert[ch.toString()] = 1023;
    }

    // Check for event
    ext.when_MCP3008changes = function( ch ) {
        if ( mcp3008Last[ch.toString()] == mcp3008[ch.toString()] ) {
            return false;
        }

        if ( mcp3008[ch.toString()] == -1 || mcp3008Last[ch.toString()] == -1 ) {
            mcp3008Last[ch.toString()] = mcp3008[ch.toString()];
            return false;
        }

        mcp3008Last[ch.toString()] = mcp3008[ch.toString()];
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
                    url: boeingAccessURL + "/setupGpio/" + port.toString() + "/" + GPIOMODEDOUT,
                    dataType: 'text',
                    success: function( data ) {
                        gpioMode[ port ] = GPIOMODEDOUT;
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
                    url: boeingAccessURL + "/setupGpio/" + port.toString() + "/" + GPIOMODEPULLUP,
                    dataType: 'text',
                    success: function( data ) {
                        gpioMode[ port ] = GPIOMODEPULLUP;
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
                    url: boeingAccessURL + "/setupGpio/" + port.toString() + "/" + GPIOMODEPULLDOWN,
                    dataType: 'text',
                    success: function( data ) {
                        gpioMode[ port ] = GPIOMODEPULLDOWN;
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
                gpioMode[ port ] = GPIOMODEUNKNOWN;
        }
    }

    // Set digital value
    ext.setGPIO = function( port, gpiostate ) {
        if( gpioMode[port] === GPIOMODEDOUT) {
            $.ajax({
                url: boeingAccessURL + "/setGpio/" + port.toString() + "/" + gpiostate,
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
    ext.isGPIO = function( port, gpiostate ) {
        if ( gpioMode[port] === GPIOMODEPULLUP || gpioMode[port] === GPIOMODEPULLDOWN) {
            return gpiostate === GPIOLOW && gpio[port] === GPIOLOW || gpiostate === GPIOHIGH && gpio[port] === GPIOHIGH;
        }
        boeingStatus = 1;
        boeingStatusMessage = "GPIO port is not in pull-up nor pull-down mode!"
        return false;
    }

    // Port mode
    ext.isGPIOMode = function( port, gpioDefault ) {
        if ( gpioMode[port] === gpioDefault ) {
                return true;
        }
        return false;
    }

    // Check for events
    ext.when_GPIOChanges = function( port, transition ) {
        if ( gpioMode[port] === GPIOMODEDOUT || gpioMode[port] === GPIOMODEUNKNOWN) {
            return false;   // Not in input mode
        }

        if ( gpioLast[port] === gpio[port] ) {
            return false;   // Not changed
        }

        if ( gpio[port] === GPIOUNKNOWN || gpioLast[port] === GPIOUNKNOWN ) {
            gpioLast[port] = gpio[port];
            return false;   // In unknown state (at the beginning)
        }

        if( transition === GPIORISES && gpio[port] === GPIOHIGH && gpioLast[port] === GPIOLOW ) {
            gpioLast[port] = gpio[port];
            return true;    // Low -> High
        }

        if( transition === GPIOFALLS && gpio[port] === GPIOLOW && gpioLast[port] === GPIOHIGH ) {
            gpioLast[port] = gpio[port];
            return true;    // High -> Low
        }

        return false;
    }



    //////////////////////////
    // TLC5947 functions    //
    //////////////////////////

    // Set digital value
    ext.setTLC5947 = function( ch, value ) {
        $.ajax({
            url: boeingAccessURL + "/setTLC5947/" + ch + "/" + Math.round(value * 4095),
            dataType: 'text',
            error: function( jqXHR, textStatus, errorThrown ) {
                if ( boeingStatus == 2 ) {
                    boeingStatus = 1;
                    boeingStatusMessage = textStatus;
                }
            }
        });
    }


    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            // Block type, block name, function name, param1 default value, param2 default value
            [' ', 'v31', 'isGPIOHigh'],
            ['r', 'mcp3008 ch %m.mcp3008ch', 'getMCP3008', 0],
            [' ', 'revert mcp3008 ch %m.mcp3008ch', 'revertMCP3008', 0],
            ['h', 'when mcp3008 ch %m.mcp3008ch changes', 'when_MCP3008changes', 0],

            [' ', 'init GPIO %d for %m.gpiodefault', 'initGPIO', 0, GPIOMODEPULLDOWN],
            [' ', 'set GPIO %d to %m.gpiostate', 'setGPIO', 0, 'high'],
            ['b', 'GPIO %d %m.gpiostate?', 'isGPIO', 0, 'low'],
            ['b', 'GPIO %d %m.gpiodefault?', 'isGPIOMode', 0, GPIOMODEPULLDOWN],
            ['h', 'when GPIO %d %m.transition', 'when_GPIOChanges', 0, 'rises'],

            [' ', 'set TLC5947 %d to %d', 'setTLC5947', 0, 1],
        ],
        menus: {
            mcp3008ch: ['0','1','2','3','4','5','6','7'],
            transition: [GPIOFALLS, GPIORISES],
            gpiodefault: [GPIOMODEDOUT, GPIOMODEPULLDOWN, GPIOMODEPULLUP],
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