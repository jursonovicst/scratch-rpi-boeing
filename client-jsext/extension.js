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

    var thrust_levers  = [-1, -1];
    var revertThrustLevers  = [0, 0];


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

                    if ( sensor[0] == "mcp3008" && Number(sensor[1]) == 0 && Number(sensor[2] == 0))
                        thrust_levers[0] = Math.abs(revertThrustLevers[0] - Number(elements[1])) / 1023;
                    if ( sensor[0] == "mcp3008" && Number(sensor[1]) == 0 && Number(sensor[2] == 1))
                        thrust_levers[1] = Math.abs(revertThrustLevers[1] - Number(elements[1])) / 1023;
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

    ext.getThrustLever = function( lever_no ) {
        ext._readData("/mcp3008/0/" + lever_no);
        return thrust_levers[lever_no];
    }

    ext.revertThrustLever = function( lever_no ) {
        revertThrustLevers[lever_no] = 1023;
    }

    ext.when_thrustLever = function(lever_no) {

        if ( typeof ext.when_thrustLever.thrust_levers == 'undefined' || thrust_levers[lever_no] == -1) {
            ext.when_thrustLever.thrust_levers = [thrust_levers[0], thrust_levers[1]];
            return false;
        }

        if ( thrust_levers[lever_no] != ext.when_thrustLever.thrust_levers[lever_no]) {
            ext.when_thrustLever.thrust_levers = [thrust_levers[0], thrust_levers[1]];
            return true;
        }

        ext.when_thrustLever.thrust_levers = [thrust_levers[0], thrust_levers[1]];
        return false;
    };

    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            // Block type, block name, function name, param1 default value, param2 default value
            ['r', 'read thrust lever %m.thrustlever', 'getThrustLever', 0],
            ['', 'revert thrust lever %m.thrustlever', 'revertThrustLever', 0],
            ['h', 'when thrust lever %m.thrustlever changes', 'when_thrustLever', 0],
        ],
        menus: {
            thrustlever: ['0','1'],
        },
        url: 'http://info.scratch.mit.edu/WeDo',
        displayName: 'Boeing'
    };

    // Register the extension
    ScratchExtensions.register('Boeing extension', descriptor, ext);

    //Start polling
    ext._poll();

})({});