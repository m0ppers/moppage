+++
title = "WebGL and frequent texture updates"
date = 2016-01-30
[taxonomies]
tags = ["babylon.js",
  "performance",
  "jpeg",
  "webgl",
  "webworker",
  "gamedev"]
+++
I am very close to releasing my first mobile game ever. Doing mobile imposes some interesting performance issues. My current computers all have decent hardware and I didn't have any problems developing a simple WebGL game on them. However the plan has always been to publish the game to mobile devices.

During the game there will be VERY frequent texture changes. Analyzing the performance of the game it quickly became clear that I had to do something about the texture performance.

## Textures in babylon.js

Texturing in babylon.js is as simple as passing a URL and it will then load the texture. There is also the possibility to create a dynamic texture using an additional canvas.

However I had a fixed amount of textures where I had to replace the underlying imagedata completely. As far as I know this is only possible in babylon.js (correct me) by disposing the old one and creating a new one (slow) or by using a dynamic texture and facilitating the underlying canvas (SLOOOOOOOW).

So I created a simple helper class which would do the texturing. You create it once and then you may call `setImage(HTMLImage)` and it will just update the imagedata. I also experimented a bit with texSubImage2D as [jsperf](https://jsperf.com/webgl-teximage2d-vs-texsubimage2d/39) indicated that texSubImage2D might be a bit faster. However that doesn't seem to be a real gamechanger and heavily depends on the browser (firefox seems to make a real difference there).

You can find my imagetexture here:

https://github.com/m0ppers/babylonjs-imagetexture

Not having to dispose and recreate the textures already helped big time. However it was still lagging heavily and still the image decoding took way too much time. The big problem is that as everything is running in the mainthread. Image decoding would slow down the game itself and the game experience itself will suffer.

## Webworkers and Images

So my next idea was to offload image decoding into a webworker.

I made a quick experiment and quickly found out that this is not as simple as doing

```
var img = new Image()
img.src = src;
img.onload = ...
```

The reason for that is that WebWorkers don't have access to the DOM. The HTMLImageElement is tightly coupled to the DOM and thus not available.

So I started googling and as expected I was not the first to have that problem.

I stumbled upon this excellent article:

https://aerotwist.com/blog/one-weird-trick/

I quickly adapted that to my WebGL problem and see what:

My main thread ran smoothly now even on my very old phone :)

Please note that this is NOT the holy grail. Image decoding in the browser is MUCH faster and even though I currently use 2 decoding threads in my game I am loosing texture updates from time to time because it takes so long to decode the image in a worker thread. However my biggest problem (fps drops in WebGL) was solved.

A simple WebGL-native example I put together can be found here:

https://github.com/m0ppers/webgl-webworker-texture-helloworld