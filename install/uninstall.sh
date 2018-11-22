systemctl stop comfash-be.service
systemctl disable comfash-be.service
rm /etc/systemd/system/comfash-be.service
echo "comfash-be.service succesfully uninstalled"
