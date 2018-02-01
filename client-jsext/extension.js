(function(ext) {
    console.log('Beoing');

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

    var mcp3008  = [[-1,-1,-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1,-1,-1]];
    var mcp3008Last  = [[-1,-1,-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1,-1,-1]];
    var mcp3008Revert  = [[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0]];

    const gpioHigh = 1, gpioLow = 0, gpioUnknown = -1;
    var gpio = [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1];
    var gpioLast = [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1];

    const gpioModeUnknown = -1, gpioModePullUp = 0, gpioModePullDown = 1, gpioModeDOut = 3;
    var gpioMode = [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1];

    // Cleanup function when the extension is unloaded
    ext._shutdown = function (
    ) {};


    // Status reporting code
    // Use this to report missing hardware, plugin or unsupported browser
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

    // General communication with the Boeing python daemon
    ext._poll = function() {
        if ( boeingStatus != 0) {

            $.ajax({
                url: boeingAccessURL + "/poll",
                dataType: 'text',
                success: function( data ) {
                    var lines = data.split('\n');
                    for(var i = 0;i < lines.length;i++){
                        var elements = lines[i].split(' ');
                        var sensor = elements[0].split('/');
                        switch( sensor[0] ) {
                            case 'mcp3008':     // mcp3008/<SPI>/<channel> <value>
                                if( 0 <= Number(sensor[1]) && Number(sensor[1]) <= 1 && 0 <= Number(sensor[2]) && Number(sensor[2]) <= 7 ) {
                                    mcp3008[Number(sensor[1])][Number(sensor[2])] = Math.round(Math.abs(mcp3008Revert[Number(sensor[1])][Number(sensor[2])] - Number(elements[1])) * 250 / 1023 ) / 250;
                                }
                                break;
                            case 'gpio':        // gpio/<port>/<mode> <value>
                                if( 0 <= Number(sensor[1]) && Number(sensor[1]) <= 26 ) {
                                    gpioMode[Number(sensor[1])] = Number(sensor[2]);
                                    if( Number(sensor[2]) == gpioModePullDown || Number(sensor[2]) == gpioModePullUp ) {
                                        gpio[Number(sensor[1])] = Number(elements[1]);
                                    }
                                }
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
        return mcp3008[spidev][mcp3008ch];
    }

    // Replace max-min values (useful for reverse inserted sliding potmeters).
    ext.revertMCP3008 = function( mcp3008ch, spidev ) {
        mcp3008Revert[spidev][mcp3008ch] = 1023;
    }

    // Check for event
    ext.when_MCP3008changes = function( mcp3008ch, spidev ) {
        if ( mcp3008Last[spidev][mcp3008ch] == mcp3008[spidev][mcp3008ch] ) {
            return false;
        }

        if ( mcp3008[spidev][mcp3008ch] == -1 || mcp3008Last[spidev][mcp3008ch] == -1 ) {
            mcp3008Last[spidev][mcp3008ch] = mcp3008[spidev][mcp3008ch];
            return false;
        }

        mcp3008Last[spidev][mcp3008ch] = mcp3008[spidev][mcp3008ch];
        return true;
    };


    ///////////////////////
    // GPIO functions    //
    ///////////////////////

    // Init GPIO default, blocking!
    ext.initGPIO = function( port, gpioDefault ) {
        switch( gpioDefault ) {
            case 'd-out':
                $.ajax({
                    url: boeingAccessURL + "/setupGpio/" + port + "/" + gpioModeDOut,
                    dataType: 'text',
                    success: function( data ) {
                        gpioMode[ port ] = gpioModePullUp;
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
                    url: boeingAccessURL + "/setupGpio/" + port + "/" + gpioModePullUp,
                    dataType: 'text',
                    success: function( data ) {
                        gpioMode[ port ] = gpioModePullUp;
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
                    url: boeingAccessURL + "/setupGpio/" + port + "/" + gpioModePullDown,
                    dataType: 'text',
                    success: function( data ) {
                        gpioMode[ port ] = gpioModePullUp;
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
                gpioMode[ port ] = gpioModeUnknown;
        }
    }

    // Set digital value
    ext.setGPIO = function( gpiostate, port ) {
        if( gpioMode[port] == gpioModeDOut) {
            //TODO: command
        }
    }

    // Read digital value
    ext.isGPIO = function( port, gpiostate ) {
        if ( gpioMode[port] == gpioModePullUp || gpioMode[port] == gpioModePullDown) {
            if ( gpiostate == 'low' && gpio[port] == gpioLow || gpiostate == 'high' && gpio[port] == gpioHigh ) {
                return true;
            }
        }
        return false;
    }

    // Check for events
    ext.when_GPIOChanges = function( port, transition ) {
        if ( gpioMode[port] == gpioModeDOut || gpioMode[port] == gpioModeUnknown) {
            return false;   // Not in input mode
        }

        if ( gpioLast[port] == gpio[port] ) {
            return false;   // Not changed
        }

        if ( gpio[port] == gpioUnknown || gpioLast[port] == gpioUnknown ) {
            gpioLast[port] = gpio[port];
            return false;   // In unknown state (at the beginning)
        }

        if( transition == 'rises' && gpio[port] == gpioHigh && gpioLast[port] == gpioLow ) {
            gpioLast[port] = gpio[port];
            return true;    // Low -> High
        }

        if( transition == 'falls' && gpio[port] == gpioLow && gpioLast[port] == gpioHigh ) {
            gpioLast[port] = gpio[port];
            return true;    // High -> Low
        }

        return false;
    }

    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            // Block type, block name, function name, param1 default value, param2 default value
            ['', 'v22', 'isGPIOHigh'],
            ['r', 'mcp3008 ch %m.mcp3008ch SPI %m.spidev', 'getMCP3008', 0, 0],
            ['', 'revert mcp3008 ch %m.mcp3008ch SPI %m.spidev', 'revertMCP3008', 0, 0],
            ['h', 'when mcp3008 ch %m.mcp3008ch SPI %m.spidev changes', 'when_MCP3008changes', 0, 0],

            ['', 'init GPIO %d for %m.gpiodefault', 'initGPIO', 0, 'pull-down'],
            ['', 'set GPIO %d %m.gpiostate', 'setGPIO', 0, 'high'],
            ['b', 'GPIO %d %m.gpiostate?', 'isGPIO', 0, 'low'],
            ['h', 'when GPIO %d %m.transition', 'when_GPIOChanges', 0, 'rises'],
        ],
        menus: {
            mcp3008ch: ['0','1','2','3','4','5','6','7'],
            spidev: ['0','1'],
            transition: ['falls', 'rises'],
            gpiodefault: ['pull-up', 'pull-down', 'd-out'],
            gpiostate: ['high','low'],
        },
        url: 'http://info.scratch.mit.edu/WeDo',
        displayName: 'Boeing'
    };

    // Register the extension
    ScratchExtensions.register('Boeing extension', descriptor, ext);

    //Start polling
    ext._poll();

})({});