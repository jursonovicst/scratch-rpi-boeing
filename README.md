# scratch-rpi-boeing

## Install

```bash
git clone etc...
checkout ...
```

### Server

Systemd script, etc...

```bash
cd /etc/systemd/system/
sudo ln -s /home/pi/scratch-rpi-boeing/server/cardplane-hw.service
sudo systemctl start cardplane-hw
systemctl status cardplane-hw
sudo systemctl enable cardplane-hw

sudo ln -s /home/pi/scratch-rpi-boeing/server/cardplane-api.service
sudo systemctl start cardplane-api
systemctl status cardplane-api
sudo systemctl enable cardplane-api
```

### Client extension

```bash
cd /usr/lib/scratch2/scratch_extensions
sudo ln -s /home/pi/scratch-rpi-boeing/client-jsext/cardplane-hw-jsext.js
sudo ln -s /home/pi/scratch-rpi-boeing/client-jsext/cardplane-api-jsext.js
cd /usr/lib/scratch2/medialibrarythumbnails
sudo ln -s /home/pi/scratch-rpi-boeing/client-jsext/cardplane-hw-thumb.png
sudo ln -s /home/pi/scratch-rpi-boeing/client-jsext/cardplane-api-thumb.png
```

Merge the content of `extensions.js` with `/usr/lib/scratch2/scratch_extensions/extensions.json`.


