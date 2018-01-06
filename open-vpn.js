module.exports = function(RED) {
    function OpenVpn(config) 
    {
        // Cancella processo di verifica connessione vpn
        var destroyCheckConnection=function(){
            if(node.context.checkTimeout!==undefined&&node.context.checkTimeout!==undefined)
            {
                clearInterval(node.context.checkTimeout);
            }
        };

	    this.shell=require("child_process").exec;

        RED.nodes.createNode(this,config);
        this.certificate=config.certificate;

        var node = this;
        node.on('input', function(msg)
        {
            node.context.isInError=true;
            node.context.isConnected=false;            

            if(msg.payload===true) // Se True : Connette VPN
            {
                const ovpnProcess=node.shell("openvpn --config "+node.certificate+"&");
                node.context.processId=ovpnProcess.pid+1;

                //Evento di notifica collegamento VPN
                ovpnProcess.stdout.on('data', function(data) {
                    if(data.toLowerCase().indexOf("initialization sequence completed")!=-1)
                    {
                        //Ricava indirizzo ip assegnato alla vpn
                        const ifaces = require('os').networkInterfaces();
                        var address;
                        Object.keys(ifaces).forEach(dev => {
                          ifaces[dev].filter(details => {
                            if (details.family === 'IPv4' && details.internal === false && dev==='tun0') {
                              address = details.address;
                            }
                          });
                        });
                        msg.payload=address;

                        //Verifica connessione ad intervalli di 30 secondi
                        node.context.checkTimeout=setInterval(function(){
                            node.shell("ping -c 1 -W 2 "+address,function(error, stdout, stderr){
                                if(stdout!==undefined)
                                {
                                    if(stdout.indexOf("1 received")==-1)
                                    {
                                        if(node.context.isConnected)
                                        {
                                            node.context.isConnected=false;
                                            msg.payload=false;
                                            node.status({fill:"yellow",shape:"ring",text:"disconnected"});
                                            node.send([null,msg]);
                                        }
                                    } 
                                    else
                                    {
                                        if(!node.context.isConnected)
                                        {
                                            node.context.isConnected=true;
                                            msg.payload=address;
                                            node.status({fill:"green",shape:"dot",text:"connected"});
                                            node.send([msg,null]);
                                        }
                                    }
                                }
                            });
                        },30000);

                        node.context.isInError=false;
                        node.context.isConnected=true; 
                        node.status({fill:"green",shape:"dot",text:"connected"});
                        node.send([msg,null]);
                    }
                });

                //Evento di notifica errore VPN
                ovpnProcess.stderr.on('data', function(data) {
                    msg.payload=false;
                    destroyCheckConnection();
                    node.status({fill:"red",shape:"dot",text:"error"});
                    node.error(data,msg);
                    node.send([null,null]);
                });

                //Evento di notifica scollegamento VPN
                ovpnProcess.on('close', function(code) {
                    if(node.context.isInError)
                    {
                        msg.payload=false;
                        node.status({fill:"yellow",shape:"ring",text:"disconnected"});
                        node.send([null,msg]);
                    }
                });                
            }
            else if(msg.payload===false) // Se False : Disconnette VPN
            {
                if(node.context.processId!==undefined)
                {
                    msg.payload=false;
                    destroyCheckConnection();
                    node.shell("kill "+node.context.processId.toString());
                }
                else
                {
                    node.status({fill:"red",shape:"dot",text:"error"});
                    node.error("VPN is not connected",msg);
                    node.send([null,null]);
                }
            }
            else // Altro
            {
                node.status({fill:"red",shape:"dot",text:"error"});
                node.error("set true or false to msg.payload before execute event",msg);
                node.send([null,null]);
            }
        });

        node.on('close', function(done) {
            done();
            msg.payload=false;
            node.context.isConnected=false;
            node.context.isInError=true;
            destroyCheckConnection();
            node.status({});
            node.send([null,null]);
        });        
    }

    RED.nodes.registerType("open-vpn",OpenVpn);
}