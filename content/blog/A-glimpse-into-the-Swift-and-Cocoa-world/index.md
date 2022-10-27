+++
title = "A glimpse into the Swift and Cocoa world"
date = 2014-12-30
+++

A few month ago i was searching for a tool to sync some files between all of my devices. As i don't really like being spied on i didn't go for a lazy solution (SkyDrive, iCloud et al) but searched a bit more and finally stumpled upon [syncthing](https://syncthing.net/) which i really liked right from the start:

<!-- more -->

- open source
- completely distributed (no centralized tracker like bittorrent sync)
- small
- easy to setup
- written in Go (which i really like)
- angular.js frontend

While it works and is easy to setup it is not as easy to keep it running. In fact i set everything up and then i never started it because i had to manually do it or i would have to create cumbersome launchentries/autostart/upstart/systemd entries on all of my devices. While of course possible i was simply to lazy to ever do it. I always wanted a simple systray icon which keeps syncthing running in the background. For windows there are two tray solutions. Both are not ideal IMHO (configure here and configure there and they both have a strange UI) but do the job. For the Mac there was nothing at hand so i created my own solution using Swift and Cocoa. I had a bit of experience (did a VERY small app years ago) in Objective-C and iOS but this thing was new to me.

## X-Code

Wow. It's amazing how bad an IDE can be. I always hated eclipse but X-Code (6) is a pile of garbage. It might be that my Mac was a bit underpowered (Macbook Pro 2009) but seriously: Ultimately i was editing text and autocompletion simply kept crashing. Furthermore X-Code was using 100% CPU constantly. At one point it even crashed that often (like every 5 words or so) that i switched to vi (autocompletion was broken anyway). At least they invested some money into logging: The crashlogs autorotated and i didn't have to worry about disc space ;) Project setup was also a bit messy. My first attempt to create a project succeeded but then i tried to remove those storyboards and messed up the project completely. So i tried to remove it and recreate it. But X-Code kept complaining that the name "syncthing-statusbar" can't be used as a project name. That's the sole reason why it is called syncthing-bar now.

Personal and fully subjective recommendation: Avoid X-Code. AT ALL COSTS

## Swift and Cocoa

Objective-C was a mess. Swift is better. I like the closures, the optional stuff (?, !) but at some points it really felt strange. I never did a full tutorial but rather learned it on the way so some of my problems might easily solve themselves when learning Swift properly.

### Embedded C Code

I can do C (wouldn't do it professionally ;) ). It feels strange to just be able to write C functions without even including some headers. However bridging the C code to the swift world is really cumbersome. At some points i really started yelling out loudly: LET ME DO THIS IN PLAIN C FFS. I couldn't even pass a CFunctionPointer containing a Swift closure. I mean what is the point of all this. It might be a matter of training and understanding the syntax better but this really drove me mad. I would have appreciated a plain C Swift bridge (swiftWorldPtr->registerClosure("testClosure", myFunctionPtr)) or even better some more (imho standard) functionality in the framework.

### Framework limitations

How do you create a simple socket? Did i really overlook something? Do i really need a third party library to do that easily? I ultimately did it using C (see above) but i would expect the framework to offer such functionality. At least in a limited form.

Signal handling is missing as well (as far as i can tell). How do you Cocoa developers handle a kill signal? There is a hook for "normal" application termination but when doing a "kill" on the console this termination hook is not called. Currently when killing the application manually the managed syncthing keeps running :|. I tried setting that up using C as well but failed calling a Swift closure from within the signal handling.

### Parsing JSON

Parsing JSON is exhausting (type casting here and there) work in Swift. I (being used to mostly dynamic languages) found it way too painful. Doable but still painful. Maybe a third party library would have solved my problem more easily.

## Conclusion

While i ranted quite a lot above it was still fun and the result is fairly ok i think.

Check it out here: [syncthing-bar](https://github.com/m0ppers/syncthing-bar/tree/master/syncthing-bar). I consider the experiment to be successful :)

However i will try to stay away from X-Code whenever possible.
