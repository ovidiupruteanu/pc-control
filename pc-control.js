var exec = require('child_process').exec;
var http = require('http');
var fs = require('fs');

http.createServer(function (request, response) {

    switch (request.url) {

        case '/':
            fs.readFile('pc-control.html', function (error, content) {
                // response.writeHead(200, { 'Content-Type': contentType });
                response.end(content, 'utf-8');
            });
            break;

        case '/sleep':
            exec('psshutdown.exe -d -t 0 -accepteula');
            return response.end('sleep');

        case '/display-off':
            exec('nircmd monitor off');
            return response.end('display off');

        case '/display-external':
            exec('DisplaySwitch.exe /external');
            return response.end('display external');

        case '/display-internal':
            exec('DisplaySwitch.exe /internal');
            return response.end('display internal');

        case '/display-extend':
            exec('DisplaySwitch.exe /extend');
            return response.end('display extend');

        case '/display-clone':
            exec('DisplaySwitch.exe /clone');
            return response.end('display clone');

        default:
            response.statusCode = 404;
            return response.end('not found ' + request.url);

    }



}).listen(57339, function () {
});


