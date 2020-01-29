const chalk = require('chalk');
const fs    = require('fs');
const os    = require('os');
const path  = require('path');
const Client = require('ssh2').Client;
let identifyFile = path.join(os.homedir(), '.bakerx', 'insecure_private_key');

exports.command = 'ssh';
exports.desc = 'SSH into the VM';
exports.builder = yargs => {
    yargs.options({
    });
};

exports.handler = async argv => {
    const { } = argv;
    (async () => {
        await ssh();
    })();
};

async function ssh(options={})
{
	return new Promise((resolve, reject) => {
            var c = new Client();
            c.on('ready', function () {
                let terminalGarbageCleared = false;
                c.shell(function (err, stream)
                {
                    if (err) throw err;
                    stream.on('close', function() {
                        console.log('Exiting...');
                        c.end();
                    }).on('data', function(data) {
                        if( !terminalGarbageCleared && data == ';' ) {
                            stream.stdin.write('\x15');
                            terminalGarbageCleared = true;
                        }
                    }).stderr.on('data', function(data) {
                        console.log('STDERR: ' + data);
                    });

                    // Redirect input/from our process into the stream
                    process.stdin.setRawMode(true);
                    process.stdin.pipe(stream);

                    // Pipe stdout/stderr into our process
                    stream.pipe(process.stdout);
                    stream.stderr.pipe(process.stderr);
		    // Setting the session window size dimensions
                    stream.setWindow(process.stdout.rows, process.stdout.columns);

                    process.stdout.on('resize', () => {
                        stream.setWindow(process.stdout.rows, process.stdout.columns);
                    });

                    stream.on('close', () => {
                        // Release stdin
                        process.stdin.setRawMode(false);
                        process.stdin.unpipe(stream);
                        if (!options.preserveStdin) {
                            process.stdin.unref();
                        }
                        c.end();
                        resolve();
                    });
                });
            }).on('error', function(err)
            {
                reject(err);
            })
            .connect({
                host: '127.0.0.1',
                port: '2800',
                username: 'vagrant',
                privateKey: fs.readFileSync(identifyFile),
            });
        });
}
