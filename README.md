# node-red-contrib-open-vpn
Openvpn plugin for node-red

Set certificate name in to "Certificate" field and set msg.payload=true for Connect to VPN or set msg.payload=false for Disconnect from OpenVPN

If vpn connected, msg.payload contain IP address of tun connection

IMPORTANT !
before starting you need to run this command to enable the necessary permissions on the openvpn executable file 
sudo chmod +s /path/of/bin/openvpn
