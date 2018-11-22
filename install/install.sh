#!/usr/bin/env bash


dir=$(dirname `pwd`)
whichcmd='which node'
nodepath=`eval $whichcmd`
user=$2
group=$3

if ["$2" == ""] || ["$3" == ""]; then
    echo "No arguments provided, please provide: 1:Environment (default: development), 2: user, 3: group"
    exit 1
fi

echo "Creating directories for public storage..."


# i=larger image files from sessions posted
mkdir $dir/public/i

# t=thumbnail image files from sessions posted
mkdir $dir/public/t

# o=original image files from sessions posted
mkdir $dir/public/o

# a=avatars
mkdir $dir/public/a

# v=videos for 360 views
mkdir $dir/public/v

# p=public for public files/thumbs downloaded
mkdir $dir/public/p

# s=shop for shop uploads 
mkdir $dir/public/s

echo "Directories created"

cat << EOF > /etc/systemd/system/comfash-be.service

[Unit]
Description=comfash-be

[Service]
PIDFile=/tmp/comfash-be.pid
ExecStart=$nodepath $dir/server.js
Restart=always
User=$user
Group=$group  
Environment=PATH=/usr/bin:/usr/local/bin
Restart=always
KillSignal=SIGQUIT
WorkingDirectory=$dir/
SyslogIdentifier=comfash-be


[Install]
WantedBy=multi-user.target

EOF

echo "Service file created"

systemctl enable comfash-be.service

systemctl start comfash-be.service

systemctl status comfash-be.service
