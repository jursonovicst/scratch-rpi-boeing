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
sudo ln -s /home/pi/scratch-rpi-boeing/server/rpi-boeing.service
sudo systemctl start rpi-boeing
systemctl status rpi-boeing
sudo systemctl enable rpi-boeing
```

### Client extension

```bash
cd /usr/lib/scratch2/scratch_extensions
sudo ln -s /home/pi/scratch-rpi-boeing/client-jsext/extension.js rpi-boeing-client-jsext.js
cd /usr/lib/scratch2/medialibrarythumbnails
sudo ln -s /home/pi/scratch-rpi-boeing/client-jsext/rpi-boeing-thumbnail.png
```

Merge the content of `extensions.js` with `/usr/lib/scratch2/scratch_extensions/extensions.json`.


