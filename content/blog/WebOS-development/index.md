+++
title = "WebOS development"
date = 2018-09-06
[taxonomies]
tags = ["webos",
  "react",
  "enact",
  "debugging",
  "experiment",
  "cors"]
+++

Around 2009 or 2010 I got my first smartphone: A Palm Pre running webOS. An awesome OS and an awesome phone at the time. When it broke and I upgraded to a Galaxy S2 it really felt like a downgrade.

<!-- more -->

After all these years I am now back on webOS: I recently bought a LG TV running webOS.

I am regularly watching german third division football via Telekomsport. With my former TV I was just connecting a Chromecast to it and streaming it via Chrome from the desktop.

For unknown reasons this setup was now stuttering from time to time. So I said to myself: Lets just quickly build an App so I can watch it natively on the TV.

HOW HARD CAN IT BE?!

![work work](https://media.giphy.com/media/UFGj6EYw5JhMQ/giphy.gif)

## webOS SDK

Downloading the webOS SDK is easy enough. You have to register and can download the SDK right away containg an emulator and a CLI.

## Telekomsport API

Luckily there is already some stuff out there where people reverse engineered what telekom is doing there: https://github.com/hubsif/kodi-telekomsport

Authentication is OAuth2 style and their backend exposes stuff from a CMS in json it seems. The structure of the site is represented in the answers of their backend.

## Building a webOS application

Doing so really boils down to just create some HTML and JS and deploy it to your TV. There is some lightweight metadata as well (project name, icons etc.) but basically it is just HTML and js. So I thought I would just spin up an editor and start developing locally and once I am finished I would simply deploy to the TV.

Deploying and testing boils down to three commands in the webOS CLI:

```
ares-package <directory-containing-html+js+metadata>
ares-install <generated-package>.ipk
ares-launch <appname>
```

However after a while it became clear that this is not possible: The telekomsport API would require some backend due to CORS security (not really a surprise but I thought it might be possible without).

## Backend work on the TV

To mitigate this there is the concept of services in webOS and I am quite sure that they were also available when webOS was still running on my phone.

These services accompany a webOS application to do "backend" work. A service is looking like this:

```
var Service = require('webos-service');
var service = new Service('koeln.mop.echo.service');

service.register('ping', function(message) {
    message.respond({
        returnValue: true,
        result: 'pong',
    })
});
```

As you can see this is javascript as well. It is deployed using its own metadata. webOS will manage the service, keep it running etc.

Services can then be called from the frontend via the a luna service request (also quite sure it was named like this back on the Palm Pre):

```
var request = webOS.service.request("luna://koeln.mop.echo.service/", {
    method:"ping",
    onSuccess: function(inResponse) {
    },
    onFailure: function(inError) {
    },
    onComplete: function(inResponse) {
    },
});
```

Seems easy enough.

As I made some progress I got to the point where I suddenly didn't get a response anymore.

## Where are the logs?

This is a question I was chasing for a long time and maybe I just overlooked something but so far the simple answer is:

_There are no logs_

This is super frustrating. I googled for quite a while was browsing their documentation etc. Ultimately I managed to get ssh access to the emulator (this is how they deploy the apps to the emulator it seems) but using the (restricted) account there I couldn't find any logs.

## Lets check with the debugger

Apart from the commands shown above there is another one:

`ares-inspect -s koeln.mop.echo.service -o`

This will open a debugger in your standard browser. The problem here is unfortunately: My standard browser is firefox and the debugger is chrome only. So I was copy pasting the url to chrome (note that if you close the firefox window before opening it in chrome the debugger will be shut down - this was making me seriously mad after some time).

Oh. There are even more problems. Remember that I said I didn't get a response above. Guess what. There is no debugger, when stuff is crashing :D

So apparently I did something wrong and webOS is leaving you **BLIND**.

## Tales from the crypt

After painful try and error I finally found out that I was using arrow functions and the like which is not supported in their runtime. On their homepage they are indeed mentioning it. webOS services have to be node 0.10.25 (!) compatible.

Node 0.10 reached end of life in 2016 and this is a 2018 model. Wow!

## Turnaround times

The more I worked with the emulator the more the turnaround times increased. Not sure why exactly (couldn't reproduce later). But given the debugging situation and the degrading turnaround times I experienced I decided to go for more architecture and created something where I could completely work locally without the emulator etc.

So I went for the full enterprise stack: React+Redux+Typescript using this awesome boilerplate:

https://github.com/rokoroku/react-redux-typescript-boilerplate

## Enact: The UI toolkit

After I had my architecture up and made progress again on the App itself it finally was time to think about style etc.

They created a UI framework specifically for their needs: http://enactjs.com/

No Typescript support

![no typescript](https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif)

Also there is quite some docs up there. But surprisingly there is nothing like a real styleguide or so. The UI elements are described but there is no real guideline how to put stuff together. Instead they offer many react tutorials which you can already read on the internet.

Unfortunately they also assume you start off with their starter leaving you with a non typescript project.

Well so I created a stub project with their framework (wow this thing is downloading the whole internet!) and tried to extract the necessary parts and make it a real webOS App again. There were quite a few subtleties hidden in there but in the end I succeeded.

## webpack magic

To create a real webOS application you also need the webOS javascript library (just a static .js file) that was present in my old super-hack attempt. So I quickly added `copy-webpack-plugin` and added it to the index.html.

Fail. Again.

I don't know about you but when webpack is misconfigured then for me it is EXTREMELY hard to figure out what is going wrong.

As the index file is named .html in the boilerplate it was trying to resolve the script references in the index.html to do some of its magic and it failed. This took me I think a few hours:

DON'T NAME YOUR TEMPLATES `.html` (there is even an official warning for this).

Renaming `.html` to `.tpl` fixed the problem immediately.

## webOS striking back again

The webpack setup I had was outputting artifacts with absolute links. However webOS needs relative URLs. That meant switching to hash based routing and changing the webpack configuration but again: frustration. Ultimately I realized that this is not a weekend project anymore.

## Fail at last

Remember when I said that my chromecast was stuttering? Guess what: Same now natively on webOS (just not as bad):

http://developer.lge.com/community/forums/RetrieveForumContent.dev?detailContsId=FC02080825&sMenuId=53&contsTypeCode=QUE&prodTypeCode=TV

So after a few days I now got an answer and it indeed fixes the problem.

I am now hoping my app will never brake (as soon as they change fundamental things in their CMS it will) so I will never have to use my Chromecast again because this will now most likely run without stuttering as well.

![facepalm](https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif)

You can inspect the (still hackish) result here:

https://github.com/m0ppers/webos-telekomsport
