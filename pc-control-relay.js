const exec = require('child_process').exec;
const http = require('http');
const fs = require('fs');
const dns = require('dns');
const wol = require('wol');

var config = JSON.parse(fs.readFileSync('relay-config.json'));

for (let key in config) {
    let comp = config[key];
    dns.lookup(comp.address, (err, address, family) => {
        comp.ip = address;
        let broadcast = comp.ip.split('.');
        broadcast.splice(3, 1, '255');
        comp.broadcast = broadcast.join('.');
        // console.log(comp);
    });
}

http.createServer(function (request, response) {

    switch (request.url) {

        case '/':
            return response.end(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>PC Control</title>
                </head>
                <body>
                    ${Object.keys(config).map(key => `
                        <h2>${key}</h2>
                        <a href="/${key}/wake">Wake</a><br/>
                        <a href="/${key}/sleep">Sleep</a><br/>
                        <a href="/${key}/display-off">Display Off</a><br/>
                        <a href="/${key}/display-external">Display External</a><br/>
                        <a href="/${key}/display-internal">Display Internal</a><br/>
                        <a href="/${key}/display-extend">Display Extend</a><br/>
                        <a href="/${key}/display-clone">Display Clone</a><br/>
                    `).join("")}
                
                </body>
                </html>
                `);

        default:
            let q = request.url.split('/');
            let key = q[1];
            let command = q[2];

            if (command == 'wake') {
                wol.wake(config[key].mac, {
                    address: config[key].broadcast
                });
            } else {
                http.get(`http://${config[key].address}:57339/${command}`)
            }

            return response.end(`${key} : ${command}`);
    }

}).listen(57338, function () {
});


