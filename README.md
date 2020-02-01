# HW1-Virtualization-Basics

**VM SETUP**
> *Add a NIC with NAT networking.*
```
await VBoxManage.execute("modifyvm", `${name} --nic1 nat`); 
await VBoxManage.execute("modifyvm", `${name} --nictype1 virtio`);
```
> *Add a port forward from 2800 => 22 for guestssh.*
```
await VBoxManage.execute("modifyvm", `${name} --natpf1 "guestssh,tcp,,2800,,22"`); 
```
> *Add a port forward from 8080 => 9000 for a node application.*
```
await VBoxManage.execute("modifyvm", `${name} --natpf1 "nodeport,tcp,,8080,,9000"`);
```

>CONSOLE OUTPUT
<p align="center"> 
<img src="https://media.github.ncsu.edu/user/12214/files/b4a79880-422f-11ea-9d8d-f5841acec9e4" width="1000" height="200">
</p>

>VIRTUALBOX OUTPUT
<p align="center"> 
<img src="https://media.github.ncsu.edu/user/12214/files/752d7c00-4230-11ea-8850-fc14b8f7165f" width="900" height="400">
</p>

**POST CONFIGURATION**
> *Install nodejs, npm, git*
```
await ssh(`"curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -"`);                                                                        
await ssh("sudo apt-get install -y nodejs");
await ssh("sudo apt install git");
```
> *Clone https://github.com/CSC-DevOps/App*
```
await ssh("git clone https://github.com/CSC-DevOps/App");
```
> *Install the npm packages*
```
await ssh(`"cd App && npm install"`);
```

>CONSOLE OUTPUT
<p align="center"> 
<img src="https://media.github.ncsu.edu/user/12214/files/b758bc80-4234-11ea-9eeb-83593accc48c" width="500" height="250">
</p>
<p align="center"> 
<img src="https://media.github.ncsu.edu/user/12214/files/b58ef900-4234-11ea-94fb-65348550566b" width="500" height="400">
</p>

**SSH AND APP**
>*Implement and demonstrate running v ssh*
<p align="center"> 
<img src="https://media.github.ncsu.edu/user/12214/files/811c3c80-4236-11ea-9ef3-cc5af9b5260f" width="500" height="400">
</p>

>*Manually run node main.js start 9000*
<p align="center"> 
<img src="https://media.github.ncsu.edu/user/12214/files/c5a7d800-4236-11ea-843b-637f4d10a053" width="500" height="150">
</p>

>*Demonstrate you can visit localhost:8080 to see your running App.*
<p align="center"> 
<img src="https://media.github.ncsu.edu/user/12214/files/c80a3200-4236-11ea-9ccd-93cecd1f6952" width="900" height="150">
</p>

**EXTRA REQUIREMENTS**
>*Create a second NIC with bridged networking enabled and assign IP to it via dhclient. Demonstrate that you can use your 
IP address to visit address:9000 to see your running App.*
```
await VBoxManage.execute("modifyvm", `${name} --nic2 bridged --bridgeadapter2 "${await defaultNetworkInterface()}"`);                                               
await VBoxManage.execute("modifyvm", `${name} --nictype2 virtio`);
await ssh("sudo dhclient enp0s8");
```
>CONSOLE OUTPUT
<p align="center"> 
<img src="https://media.github.ncsu.edu/user/12214/files/43b8ae80-4238-11ea-8987-55ea9f32f39b" width="900" height="50">
</p>
<p align="center"> 
<img src="https://media.github.ncsu.edu/user/12214/files/58954200-4238-11ea-8e2a-63b2d8e3014c" width="900" height="120">
</p>

>VIRTUALBOX OUTPUT
<p align="center"> 
<img src="https://media.github.ncsu.edu/user/12214/files/b6298e80-4238-11ea-893f-464e0d7e0b96" width="500" height="400">
</p>

>VERIFICATION OF BRIDGED NETWORK IS THAT HOST INTERFACE AND GUEST INTERFACE SHOULD BE IN THE SAME NETWORK

If you see both these interfaces belong to the same network of 192.168.x.x subnet mask 255.255.255.0
<p align="center"> 
<img src="https://media.github.ncsu.edu/user/12214/files/38b24e00-4239-11ea-8a6d-2f29a0e31304" width="400" height="200">
</p>
<p align="center"> 
<img src="https://media.github.ncsu.edu/user/12214/files/3d770200-4239-11ea-9314-06e5478ba93f" width="500" height="150">
</p>

>*Create a shared sync folder.*

Sample command - 
```
v up -s "C:\temp\first;/home/vagrant/first" "C:\temp\second;/home/vagrant/second"
```
The arguments of -s are host path and guest path respectively separated by a semi-colon. Here I am trying to share the first and 
second folders in the temp directory of C drive with the guest operating system.

This requires adding sharedfolder via VBoxManage :
```
Executing "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" sharedfolder add V-C:-Users-udita-DevOps-V --name "vbox-share-0" --hostpath "C:\temp\first"           
Executing "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" sharedfolder add V-C:-Users-udita-DevOps-V --name "vbox-share-1" --hostpath "C:\temp\second"          
```
Once the shares have been created we would create the folders in the guest operating system as mentioned in 
the command line as part of the post configuration. After doing that we mount the above created share names 
on the folders just created. This would automatically sync up the mentioned folders in host and guest operating 
systems. Any new creation of folders in any operating system would reflect the same in the other.
```
console.log(chalk.green(`"Creating a mount for vbox-share-${count}"`));                                                                                             
await ssh(`"sudo mkdir -p ${guest}"`);                                                                                                                              
await ssh(`"sudo mount -t vboxsf vbox-share-${count} ${guest}"`); 
```

[**ANSWERING A QUESTION**](https://stackoverflow.com/c/ncsu/questions/1270/1303#1303)

[**SCREENCAST**](https://drive.google.com/open?id=1XV7V6ZEqLyzvz06PjyXqI7GG-m_bWZzk)












