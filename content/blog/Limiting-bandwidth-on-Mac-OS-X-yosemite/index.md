+++
title = "Limiting bandwidth on Mac OS-X yosemite"
date = 2015-06-01
[taxonomies]
tags = ["mac",
  "osx",
  "pf",
  "dummynet"]
+++
Using older Mac OS-X versions limiting bandwidth was as easy as

```bash
ipfw pipe 1 config bw 30Kbytes/s  
ipfw add 1 pipe 1 tcp from any to me  
```

This is really handy when you want to test if your applications work properly on slow networks.

I needed it now to make some cucumber tests working: They are uploading stuff. However on a local network this is of course very fast and I never got to see the progress bar I expected to see.

I didn't want to pollute my application with bandwidth throttling code so I went the hard way and tried to get bandwidth throttling to work on yosemite. Googling provided some hints but no real solution (in my case). If you just want to limit EVERYTHING you can simply install Apple's "Network Link Conditioner".
It provides templates for common bad network situations (i.e. drop every 5th packet etc). I however only wanted to limit a certain port (namely the one where my application is working on).

Apple replaced "ipfw" with "pf" (OpenBSD's Packet Filter). However they are missing a crucial feature for bandwidth throttling: ALTQ. Whenever you search for bandwidth throttling with pf, references depending on ALTQ support come up. However Apple seems to have hacked it in a way that you can use "dummynet", Apple's old way to do traffic shaping (the Network Link Conditioner uses it as well). However googling was - again - not very helpful. So after reading man pages (can't even remember when I last had to do that) and putting some pieces from various blog posts together here is my solution:

1. Create a custom anchor in pf

    `(cat /etc/pf.conf && echo "dummynet-anchor \"mop\"" && echo "anchor \"mop\"") | sudo pfctl -f -`

    This will reload your standard pf configuration plus a custom anchor named "mop". We will place our custom rules there.

2. Pipe the desired traffic to dummynet

    `echo "dummynet in quick proto tcp from any to any port 8002 pipe 1" | sudo pfctl -a mop -f -`

    This is MY rule (i needed to throttle all bandwidth on port 8002). Modify to your needs and consult pf documentation (yes - that is standard pf stuff apart from the dummynet :) )

3. Throttle the pipe

    `sudo dnctl pipe 1 config bw 1Mbit/s`

    Should be self explanatory :)

To reset:

    sudo dnctl flush
    sudo pfctl -f /etc/pf.conf

Traffic to port 8002 is now flowing through our pipe which is limited to 1MBit/s :)

**UPDATE**: Apparently pf seems to be disabled by default. Enable it using `sudo pfctl -E`
