const chalk = require('chalk');
const fs    = require('fs');
const os    = require('os');
const path  = require('path');

const VBoxManage = require('../lib/VBoxManage');
const ssh = require('../lib/ssh');

exports.command = 'up';
exports.desc = 'Provision and configure a new development environment';
exports.builder = yargs => {
    yargs.options({
        force: {
            alias: 'f',
            describe: 'Force the old VM to be deleted when provisioning',
            default: false,
            type: 'boolean'
        },
	syncs: {
	    alias: 's',
	    describe: 'Sync shared folders between host and guest operating systems',
	    type: 'array'
        } 
    });
};


exports.handler = async argv => {
    const { force, syncs } = argv;

    (async () => {
    
        await up(force,syncs);

    })();

};

async function up(force,syncs)
{
    // Use current working directory to derive name of virtual machine
    let cwd = process.cwd().replace(/[/]/g,"-").replace(/\\/g,"-");
    let name = `V-${cwd}`;    
    console.log(chalk.keyword('pink')(`Bringing up machine ${name}`));

    // We will use the image we've pulled down with bakerx.
    let image = path.join(os.homedir(), '.bakerx', '.persist', 'images', 'bionic', 'box.ovf');
    if( !fs.existsSync(image) )
    {
        console.log(chalk.red(`Could not find ${image}. Please download with 'bakerx pull cloud-images.ubuntu.com bionic'.`))
    }

    // We check if we already started machine, or have a previous failed build.
    let state = await VBoxManage.show(name);
    console.log(`VM is currently: ${state}`);
    if( state == 'poweroff' || state == 'aborted' || force) {
        console.log(`Deleting powered off machine ${name}`);
        // Unlock
        await VBoxManage.execute("startvm", `${name} --type emergencystop`).catch(e => e);
        await VBoxManage.execute("controlvm", `${name} --poweroff`).catch(e => e);
        // We will delete powered off VMs, which are most likely incomplete builds.
        await VBoxManage.execute("unregistervm", `${name} --delete`);
    }
    else if( state == 'running' )
    {
        console.log(`VM ${name} is running. Use 'V up --force' to build new machine.`);
        return;
    }

    // Import the VM using the box.ovf file and register it under new name.
    await VBoxManage.execute("import", `"${image}" --vsys 0 --vmname ${name}`);
    // Set memory size in bytes and number of virtual CPUs.
    await VBoxManage.execute("modifyvm", `"${name}" --memory 1024 --cpus 1`);
    // Disconnect serial port
    await VBoxManage.execute("modifyvm", `${name}  --uart1 0x3f8 4 --uartmode1 disconnected`);
    // Run your specific customizations for the Virtual Machine.
    await customize(name,syncs);

    // Start the VM.
    // Unlock any session.
    await VBoxManage.execute("startvm", `${name} --type emergencystop`).catch(e => e);
    // Real start.
    await VBoxManage.execute("startvm", `${name} --type headless`);

    // Explicit wait for boot
    let waitTime = 60000;
    console.log(`Waiting ${waitTime}ms for machine to boot.`);        
    await sleep(waitTime);
    console.log(`VM is currently: ${state}`);
    
    // Run your post-configuration customizations for the Virtual Machine.
    await postconfiguration(name,syncs);

}

async function customize(name,syncs)
{
    console.log(chalk.keyword('pink')(`Running VM customizations...`));
    console.log(chalk.green(`Install nic with nat, port forwarding for guestssh and node app`));
    await VBoxManage.execute("modifyvm", `${name} --nic1 nat`);
    await VBoxManage.execute("modifyvm", `${name} --nictype1 virtio`);
    await VBoxManage.execute("modifyvm", `${name} --natpf1 "guestssh,tcp,,2800,,22"`);
    await VBoxManage.execute("modifyvm", `${name} --natpf1 "nodeport,tcp,,8080,,9000"`);
    console.log(chalk.green(`Install a second nic with bridged networking enabled`)); 
    await VBoxManage.execute("modifyvm", `${name} --nic2 bridged --bridgeadapter2 "${await defaultNetworkInterface()}"`);
    await VBoxManage.execute("modifyvm", `${name} --nictype2 virtio`);
    console.log(chalk.green(`adding shared folder`));
    console.log("hello" + syncs.length);
    if( syncs.length > 0 )
    {
         let count = 0;
         for( var sync of syncs )
         {
             let host = sync.split(';')[0];
             let guest = sync.split(';')[1];
             await VBoxManage.execute("sharedfolder", `add ${name} --name "vbox-share-${count}" --hostpath "${host}"`);
             count++;
         }
    }
}

async function postconfiguration(name,syncs)
{
    console.log(chalk.keyword('pink')(`Running post-configurations...`));
    console.log(chalk.green(`Installing nodejs and npm`));
    await ssh(`"curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -"`);
    await ssh("sudo apt-get install -y nodejs");
    console.log(chalk.green(`Installing git`));
    await ssh("sudo apt install git");
    console.log(chalk.green(`Cloning the repo`));
    await ssh("git clone https://github.com/CSC-DevOps/App");
    console.log(chalk.green(`Installing npm packages`));
    await ssh(`"cd App && npm install"`);
    console.log(chalk.green(`dhclient to assign ip address for bridged network`));
    await ssh("sudo dhclient enp0s8");
    await setupSyncFoldersOnGuest(name,syncs);
}

async function setupSyncFoldersOnGuest(name,syncs)
{
	if( syncs.length > 0 )
        {
           // Add vboxsf to modules so we can enable shared folders; ensure our user is in vboxsf group
           try {
               let LINE =  "vboxsf"; let FILE= '/etc/modules';
               ssh(`"grep -qF -- "${LINE}" "${FILE}" || echo "${LINE}" | sudo tee -a "${FILE}""`); 
	       ssh(`"sudo usermod -a -G vboxsf vagrant"`);
           } catch (error) {
               throw `failed to setup shared folders, ${error}`;
           }
           // For every host;guest pair we would create a mount on the guest operating system
           let count = 0;
           for( var sync of syncs )
           {
               let host = sync.split(';')[0];
               let guest = sync.split(';')[1];

               try {
                   await ssh(`"sudo mkdir -p ${guest}"`);
		   await ssh(`"sudo mount -t vboxsf vbox-share-${count} ${guest}"`);
               } catch (error) {
                   throw `mount failed, ${error}`;
               }
               count++;
           }
       } 
}
//This function would return the interface name of the wifi for bridged networking
async function defaultNetworkInterface()
{
        const si = require('systeminformation');

        let interfaces = await si.networkInterfaces();
        for( var iFace of interfaces )
        {
            if( iFace.virtual == false && iFace.internal == false && iFace.ip4 ){
                return iFace.ifaceName;
            }
        }
        return "Not Found";
}

// Helper utility to wait.
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
