+++
title = "Umlauts again"
date = 2019-03-17
[taxonomies]
tags = ["year of the linux desktop",
  "xkb",
  "linux",
  "sway"]
+++
Since December I am on Linux with my main machine again. I always wanted to do a rant post about the year
of the linux desktop but instead I am posting something useful.

I am using US keyboards on my laptop and whenever I have to type some german umlauts I mostly just don't care.
However for the rare cases when I care (writing serious german emails) I was super annoyed. I was mostly opening
this page here https://learn-german-easily.com/german-umlauts and copy-pasted the characters. Obviously I tried
avoiding using umlauts all together because this is super annoying.

Today I finally fixed it and it was a lot easier than I thought.

Apparently xkb (X Keyboard Extension) already provides everything you need. When you enable the xkb variant "altgr-intl"
you are able to type special characters using the so called "Compose" Key.

Most examples you find will tell you how to configure it in X11.

My setup is using wayland via sway. My `~/.config/sway/config`:

```
[...]

input "1:1:AT_Translated_Set_2_keyboard" {
    xkb_layout us
    xkb_variant altgr-intl
    xkb_options compose:ralt
}

input "1241:41265:HOLTEK_USB-HID_Keyboard" {
    xkb_layout us
    xkb_variant altgr-intl
    xkb_options compose:ralt
}
```

This will enable everything for both of the keyboards (I am using an external keyboard most of the time).

To find out the identifier do the following:

```
[mop@konrad-georg ~]$ sudo libinput debug-events
```

This will print out a list of input devices. When you press a key you will see an eventid which you can map
to the input device:

```
[...device list]
-event4   DEVICE_ADDED     AT Translated Set 2 keyboard      seat0 default group13 cap:k
[...more devices]
[...pressing a key]
-event4   KEYBOARD_KEY      +1.31s	*** (-1) pressed
```

Now we know the name of our keyboard. Unfortunately sway needs the identifier.

```
[mop@konrad-georg ~]$ swaymsg -t get_inputs
[...]
Input device: AT Translated Set 2 keyboard
  Type: Keyboard
  Identifier: 1:1:AT_Translated_Set_2_keyboard
  Product ID: 1
  Vendor ID: 1
  Active Keyboard Layout: English (intl., with AltGr dead keys)
  Libinput Send Events: enabled
[...]
```

Finally after restarting sway we can type german umlauts again:

```
Press RAlt, Release RAlt, Press a, Release a, Press ", Release " => ä
Press RAlt, Release RAlt, Press o, Release o, Press ", Release " => ö
Press RAlt, Release RAlt, Press u, Release u, Press ", Release " => ü
Press RAlt, Release RAlt, Press s, Release s, Press s, Release s => ß
Press RAlt, Release RAlt, Press C, Release C, Press =, Release = => €
```

There is probably more :)
