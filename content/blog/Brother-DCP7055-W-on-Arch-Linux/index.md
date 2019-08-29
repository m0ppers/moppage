+++
title = "Brother DCP7055-W on Arch Linux"
date = 2019-02-03
[taxonomies]
tags = ["Arch Linux",
  "Printing",
  "Year of the linux desktop",
  "CUPS"]
+++
Finally managed to get my printer working on Arch Linux and I needed a 2019 blog post anyway.

```
sudo pacman -S cups avahi-daemon
sudo systemctl enable avahi-daemon
sudo systemctl start avahi-daemon
sudo systemctl enable org.cups.cupsd
sudo systemctl start org.cups.cupsd
```

This will install cups and avahi daemon for zeroconf/bonjour discovery capabilities.

After that `avahi-list -a` and `sudo lpinfo -v` should list your printer.

Then we need to install the driver (no success with the bundled drivers :|).

```
git clone https://aur.archlinux.org/brlaser.git
cd brlaser
makpkg -i
```

Now it is time to add the printer to CUPS (Note that the -v option might be different for you (use the output from lpinfo -v). Also change media to your paper format if you are not using A4):

```
sudo lpadmin -E -p "Brother-DCP7055W" -m "drv:///brlaser.drv/br7055w.ppd" -v "dnssd://Brother%20DCP-7055W._pdl-datastream._tcp.local/" -o media=A4
lpoptions -d Brother-DCP7055W # make it the default printer
sudo cupsenable "Brother-DCP7055W"
sudo cupsaccept "Brother-DCP7055W"
```

Then you should be able to print stuff :)

```
lpr /etc/fstab
```

The process is probably similar for other printers :)