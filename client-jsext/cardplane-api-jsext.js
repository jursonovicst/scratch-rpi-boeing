(function (ext) {
    console.log('Loading Cardplane API');

    let serverAccessURL = "http://127.0.0.1:8001";


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
                ext._setStatus(STATUSGREEN);
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
        if (status !== STATUSGREEN && message !== "") {
            statusMessage = d.toISOString() + " " + message;
        }
    };


    //////////////////////////////
    // Text to speech functions //
    //////////////////////////////

    // say
    ext.say = function (words) {
        $.ajax({
            url: serverAccessURL + "/say/" + encodeURI(words),
            dataType: 'text',
            error: function (jqXHR, textStatus, errorThrown) {
                ext._setStatus(STATUSYELLOW, textStatus)
            }
        });
    };

    // say and wait
    ext.sayUntil = function (words, callback) {
        $.ajax({
            url: serverAccessURL + "/sayuntil/" + encodeURI(words),
            dataType: 'text',
            error: function (jqXHR, textStatus, errorThrown) {
                ext._setStatus(STATUSYELLOW, textStatus)
            }
        });
        //TODO: implelent wait
        callback();
    };


    ////////////////////////////
    // Engine sound functions //
    ////////////////////////////

    // start
    ext.enginestart = function (no) {
        $.ajax({
            url: serverAccessURL + "/engine/" + no.toString() + "/start",
            dataType: 'text',
            error: function (jqXHR, textStatus, errorThrown) {
                ext._setStatus(STATUSYELLOW, textStatus)
            }
        });
    };
    // volume
    ext.enginevolume = function (no, volume) {
        $.ajax({
            url: serverAccessURL + "/engine/" + no.toString() + "/volume/" + volume.toString(),
            dataType: 'text',
            error: function (jqXHR, textStatus, errorThrown) {
                ext._setStatus(STATUSYELLOW, textStatus)
            }
        });
    };
    // stop
    ext.enginestop = function (no) {
        $.ajax({
            url: serverAccessURL + "/engine/" + no.toString() + "/stop",
            dataType: 'text',
            error: function (jqXHR, textStatus, errorThrown) {
                ext._setStatus(STATUSYELLOW, textStatus)
            }
        });
    };




    // Cleanup function when the extension is unloaded
    ext._shutdown = function () {
        //TODO: code
    };

    // Block and block menu descriptions
    let descriptor = {
        blocks: [
            // Block type, block name, function name, param1 default value, param2 default value
            [' ', 'say %s', 'say', "Hello world!"],
            ['w', 'say %s until done', 'sayUntil', "Hello world!"],
            [' ', 'engine %n start', 'enginestart', 0],
            [' ', 'engine %n volume %n', 'enginevolume', 0, 0],
            [' ', 'engine %n stop', 'enginestop', 0],
        ],
        url: 'https://github.com/jursonovicst/scratch-rpi-boeing',
        displayName: 'Cardplane API'
    };

    // Register the extension
    ScratchExtensions.register('Cardplane API', descriptor, ext);


})({});