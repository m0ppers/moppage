+++
title = "Creating a local debian vm using cloud init and libvirt"
date = 2022-10-05
[taxonomies]
tags = [
  "debian",
  "qemu",
  "cloud-init",
  "libvirt"
]
+++

No blog entry since 2019 :see_no_evil::see_no_evil::see_no_evil:

So let me share something small yet hopefully helpful. Mostly I try to do everything in containers but now I am in a project that uses ansible to deploy software to machines so I thought it might be better to spin up a VM. As it is 2022 I thought I should do it without using VMWare, Virtualbox etc. Instead I wanted to work with `libvirt` and start a `cloud-init` capable image to not have to click through some installation process.

<!-- more -->

Unfortunately this is not as easy as one would think and took me quite a while to figure out. There are many references where this takes many steps. I hope this quick post gets you started faster.

## Prerequisites

On an arch linux (btw I use Arch) you need to have the following packages installed:

```
sudo pacman -S libvirt qemu-system-x86 virt-install
```

And libvirtd must be started:

```
sudo systemctl start libvirtd
```

Then make sure your user is in group `libvirt` so it is allowed to manage VMs.

## Download the image

First of all download the appropriate _generic_ for the image here: [https://cloud.debian.org/images/cloud/](https://cloud.debian.org/images/cloud/)

In case you want bullseye on amd64 here is the direct link: [https://cloud.debian.org/images/cloud/bullseye/latest/debian-11-generic-amd64.qcow2](https://cloud.debian.org/images/cloud/bullseye/latest/debian-11-generic-amd64.qcow2)

**DO NOT DOWNLOAD THE GENERICCLOUD IMAGE (explanation later)**

Put it here: `/var/lib/libvirt/images/`

## Preparing a cloud init file

The debian image doesn't have a default user (contrary to for example ubuntu) so we need to create one during bootup.

Create a `cloud-init.yaml` config:

```
#cloud-config

users:
  # whatever username you like
  - name: mop
    # so our user can just sudo without any password
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    # content from $HOME/.ssh/id_rsa.pub on your host system
    ssh_authorized_keys:
      - ssh-rsa AAAA[...]
```

Cloud init supports pulling keys from github directly. Unfortunately that didn't work for me in the debian cloud image (ubuntu worked :thinking:). Probably debian just has an old version.

## Starting the VM

```
virt-install --name debian --memory 2048 --vcpus 4 --disk=size=10,backing_store=/var/lib/libvirt/images/debian-11-generic-amd64.qcow2 --cloud-init user-data=./cloud-init.yaml,disable=on --network bridge=virbr0 --osinfo=debian11
```

This starts a new VM and a console will come up showing the boot process and the IP that the VM is using in bridge mode. (or just issue a `ip neigh` on your host system). If you want to leave the console press `Ctrl+]` (there is also an `--noautoconsole` option for virt-install if you want it to boot in the background). You should now be able to login using the console and you should be able to ssh to the VM.

The `--disk` option is quite interesting. This uses an overlay filesystem much like docker. So the general image is shared across all future debian VMs but the changes per VM will be saved in a separate images in this directory:

```
$HOME/.local/share/libvirt/images
```

Obviously there are many things here that you can change/adjust but this is just the most simple command line that worked for me. Details can be found in the man page of `virt-install`

## Getting rid of the VM

This is also non-intuitive.

First you have to stop the machine:

```
virsh destroy --domain debian
```

And then delete it using `undefine`.

```
virsh undefine --domain debian --remove-all-storage
```

This will remove the overlay filesystem containing all your changes to your VM but keep the base image.

I like how libvirtd uses special terms for everything. `destroy` instead of `kill`, `domain` instead of `vm` and `undefine` instead of `delete`. :see_no_evil:

## The genericcloud debian image

> genericcloud: Similar to generic. Should run in any virtualised environment. Is smaller than `generic` by excluding drivers for physical hardware.

Obviously this sounds like the right image. Unfortunately it is not. It doesn't contain the SATA AHCI drivers which are needed because of the way the cloud-init stuff is being injected into the VM (as a cdrom drive).

This took me a quite a while to figure out. After finding out what was the culprit I was finally able to google for the problem and found this: [https://groups.google.com/g/linux.debian.bugs.dist/c/fpGNuIC7GZc](https://groups.google.com/g/linux.debian.bugs.dist/c/fpGNuIC7GZc)
