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
    var boeingStatus = 0; //  0:not ready(RED), 1:partially ready or warning(YELLOW), 2: fully ready(GREEN)
    var boeingStatusMessage = "uninitialized";

    var mcp3008  = [[-1,-1,-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1,-1,-1]];
    var mcp3008Revert  = [[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0]];


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

    ext._readData = function( path ) {
        $.ajax({
            url: boeingAccessURL + path,
            dataType: 'text',
            success: function( data ) {
                var lines = data.split('\n');
                for(var i = 0;i < lines.length;i++){
                    var elements = lines[i].split(' ');
                    var sensor = elements[0].split('/');
                    if( sensor[0] == "mcp3008" && 0 <= Number(sensor[1]) && Number(sensor[1]) <= 1 && 0 <= Number(sensor[2]) && Number(sensor[2]) <= 7 ) {
                        mcp3008[Number(sensor[1])][Number(sensor[2])] = Math.abs(mcp3008Revert[Number(sensor[1])][Number(sensor[2])] - Number(elements[1])) / 1023;
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

    ext._poll = function() {
        if ( boeingStatus != 0) {
            ext._readData("/poll");
        }
        setTimeout(ext._poll, pollInterval);
    }

    ext.getMCP3008 = function( ch, dev ) {
        ext._readData("/mcp3008/" + dev + "/" + ch);
        return mcp3008[dev][ch];
    }

    ext.revertMCP3008 = function( ch, dev ) {
        mcp3008Revert[dev][ch] = 1023;
    }

    ext.when_MCP3008changes = function( ch, dev ) {
        if ( typeof when_MCP3008changes.mcp3008 == 'undefined' ) {
            when_MCP3008changes.mcp3008 = [[-1,-1,-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1,-1,-1]];
        }

        if ( ext.mcp3008[dev][ch] == -1 ) {
            return false;
        }

        if ( when_MCP3008changes.mcp3008[dev][ch] != ext.mcp3008[dev][ch] ) {
            when_MCP3008changes.mcp3008[dev][ch] = ext.mcp3008[dev][ch];
            return true;
        }

        return false;
    };

    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            // Block type, block name, function name, param1 default value, param2 default value
            ['', 'v8', 'when_thrustLever'],
            ['r', 'read mcp3008 ch %m.mcp3008ch dev %m.spidev', 'getMCP3008', 0, 0],
            ['', 'revert mcp3008 ch %m.mcp3008ch dev %m.spidev', 'revertMCP3008', 0, 0],
            ['h', 'when mcp3008 ch %m.mcp3008ch dev %m.spidev changes', 'when_MCP3008changes', 0, 0],
        ],
        menus: {
            thrustlever: ['0','1'],
            mcp3008ch: ['0','1','2','3','4','5','6','7'],
            spidev: ['0','1'],
        },
        url: 'http://info.scratch.mit.edu/WeDo',
        displayName: 'Boeing'
    };

    // Register the extension
    ScratchExtensions.register('Boeing extension', descriptor, ext);

    //Start polling
    ext._poll();

})({});