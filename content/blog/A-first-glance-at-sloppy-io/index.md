+++
title = "A first glance at sloppy.io"
date = 2015-08-16
+++
I recently got a beta account for http://sloppy.io/. It's a docker hosting service built around [Mesos](http://mesos.apache.org/) and [Marathon](https://mesosphere.github.io/marathon/). Interestingly it is the second startup in Cologne trying to build a container housing company. http://giantswarm.io/ has been around a bit longer and is in open alpha since late 2014. I applied quite early for it but it seems that either the list for alpha access is really long or the answer "a filesharing application" in their application questionnaire seemed to have aroused some suspicions :D When I applied for http://sloppy.io/ there wasn't any questionnaire and I finally found some time to deploy my evil (heheh) application into the wild.

# The Test Application

One of the items on my virtual todo list is an easy to use file sharing application. The idea came to my mind when trying to share a file >20MB (so sending a mail was not appropriate) with a friend via skype. In the beginning skype initiated a peer-to-peer connection to send files. However since a (longer) while everything passes through some server and that makes file transfer much slower (unuseable) than it should be. So i wanted to have my p2p file transfers back and searched for existing solutions. Most of them require some setup like logging in, then you have a chatroom and only then you can start sharing files. I wanted a solution which doesn't really need setup and so I started creating kamelladjutant.

It is one my 72,41154% projects and I won't go into too much detail about it here. It was a playground project to try out (it is in the 72% state since quite a while ;) ) react.js. Ultimately it is using the following frontend technologies: react.js, WebRTC and websockets and it is NOT ready (it has several frontend problems and is lacking a proper Flux architecture). However the general high level architecture should be ready. It was created with microservices and scalability in mind and consists of several high level entities:

Frontend, Coordinator, Signaling.

- The frontend is what the user sees: The react application. When bundled it is just a bunch of static files
- The coordinator manages existing "share places". It is more or less a load balancer for the signaling servers
- The signaling servers handle user interaction. Namely "I want to share a file with you". They handle the p2p handshaking.

Apart from the high level components there are also some backend services required. Currently this is just a redis server which stores which signaling server is managing which "share place". For those of you not familiar with WebRTC: To establish a p2p connection a direct connection is not possible in most cases (firewalls etc.). There is a neat feature called [NAT Traversal](https://en.wikipedia.org/wiki/NAT_traversal). Simply put:  Both clients connect to a common server and this server couples both browser connections and tada: We got a p2p connection. That's what a [STUN](https://de.wikipedia.org/wiki/Session_Traversal_Utilities_for_NAT) server is doing. Google and Mozilla provide some common STUN servers and currently I am using these. However a decent service (which it currently is not) should not rely on these. Not to mention privacy concerns. So once kamelladjutant is ready I plan to add STUN servers to that architecture.

This however should not really make a difference on the general architecture and this quick test.

# Docker disclaimer

I have been using docker quite a few times now but only to keep my hostsystem clean of some databases. I never built a full application based on docker images. I didn't do any real tutorials on how to organize such an application and just did what felt right so I might have done hard errors here or failed to comply with common best practices ;). This was the first time I built my own images and used docker hub.

# My first docker image

To start an application on sloppy every component of your application has to be available as a docker container.

I started by defining the frontend container. The frontend container only serves static files to the interwebs. I decided for nginx as a webserver and after struggling a bit with the standard image I simply created my own based on debian. As a n00b I named the image kamelladjutant/frontend locally and after creating an account on the docker hub I tried to push it.

    Authentication failed

WHAAAAAAT? I just created my account and it is failing immediately?! After quite a while of googling and digging through bug reports I found that the error was me. Docker hub assumes that the images are username prefixed (as in github). So the fix was to rename the image to m0ppers/kamelladjutant-frontend. But what a lousy error message. In general the user experience of the docker hub is a shame. The console output doesn't make any sense to me (maybe it will once I am a bit more experienced but it is certainly not intuitive), the upload speed is just terrible and canceling upload and retrying it will yield "Upload already in progress" etc. etc. :|

Putting these oddities aside: I managed to put my first docker container online :D

# Setting up an application on sloppy.io

Now that the first docker container was in place on the docker hub it was time to start the frontend on sloppy.io. To start an application on sloppy you create a JSON file which might look like this:

```
{
    "project": "kamelladjutant",
    "services": [
        {
            "id": "frontend",
            "apps": [
                {
                    "id": "webserver",
                    "domain": {
                        "type": "HTTPS",
                        "uri": "$domain"
                    },
                    "mem": 256,
                    "image": "m0ppers/kamelladjutant-frontend:0.3",
                    "port_mappings": [
                        {
                            "container_port": 80
                        }
                    ],
                    "instances": 1
                }
            ]
        }
}
```

It's pretty easy and pretty straightforward. Any exposed container port must be defined via "port_mappings/container_port". When you specify "domain" sloppy will automatically route the specified domain to this container and this port. This brings us to another feature of sloppy. Inside the JSON file you have full variable substitution. Note that the uri of the domain in the example is just a placeholder.

To start the application you issue a start command providing the variables that are in use:

```
hans-guenther:kamelladjutant-sloppy mop$ sloppy start kamelladjutant-sloppy.json -var=domain:kammelladjutant.sloppy.zone
```

Then sloppy will start your application and all of its dependencies. Immediately after starting it might look like this:

```
hans-guenther:kamelladjutant-sloppy mop$ sloppy show kamelladjutant/frontend
|--------------------------------------------------------------------------|
| Id        | Cmd/Args | Mem | Image                           | Instances |
|--------------------------------------------------------------------------|
| webserver |          | 256 | m0ppers/kamelladjutant-frontend | 0 from 1  |
|--------------------------------------------------------------------------|
|----------------------|
| Total Memory | 256   |
|----------------------|
```

And then the waiting starts. And more waiting...Until ultimately something happens:

```
hans-guenther:kamelladjutant-sloppy mop$ sloppy show kamelladjutant/frontend
|------------------------------------------------------------------------------|
| Id        | Cmd/Args | Mem | Image                               | Instances |
|------------------------------------------------------------------------------|
| webserver |          | 256 | m0ppers/kamelladjutant-frontend:0.2 | 0 from 0  |
|------------------------------------------------------------------------------|
```

It's broken (0 from 0 Instances) :| This happened to me a few times and quickly learned that this was sloppy's way to tell me that something is wrong with the docker container. Wrong tag, docker CMD broken. Something like that.

The point is that there is absolutely no feedback and no logs at all. Sloppy provides a "logs" command which is basically a remote tail -f. These however only contain the logs of the running container. Until then you are blind. It would really be great if there was some more feedback here like "Didn't find container tag locally. Pulling from docker hub. 14%", "Couldn't run container. Error message was: bla". Also during setting up another component I found some interesting and undocumented caveats. When creating the coordinator container I tried to work using a PORT environment variable. However this seems to be an internal variable or something. The contents of that variable never made it to the env of the container. When i renamed the variable to something more specific everything was working fine immediately. Again: No logs, no hints :(

Furthermore I didn't really manage to change stuff which is already online. The sloppy command line provides a change command but whenever I issued it I got the following:

```
hans-guenther:kamelladjutant-sloppy mop$ sloppy change kamelladjutant kamelladjutant-sloppy.json -var domain:kamelladjutant.sloppy.zone
Cannot PUT /v1/apps/kamelladjutant
```

Again. No more hints ;) I didn't really care because it is a playground application and so I simply deleted everything and restarted a completely new cluster whenever I changed something.

# Dependencies

As mentioned before sloppy is built upon Mesos and Marathon and so it is very straighforward to define dependencies:

```
{
    "project": "kamelladjutant",
    "services": [
        {
            "id": "frontend",
            "apps": [
                {
                    "id": "webserver",
                    [...]
                    "dependencies": [
                      "../../signaling/server",
                      "../../coordinator/server"
                    ]
                }
        },
        {
            "id": "signaling",
            "apps": [
                {
                    "id": "server",
                    [...]
                    "env": {
                        "REDIS_HOST": "redis.backend.kamelladjutant.andreas2",
                        [...]
                    },
                    "dependencies": [
                      "../../backend/redis"
                    ]
                }
        },
        {
            "id": "coordinator",
            "apps": [
                {
                    "id": "server",
                    [...]
                    "env": {
                        "REDIS_HOST": "redis.backend.kamelladjutant.andreas2",
                        [...]
                    },
                    "dependencies": [
                      "../../backend/redis"
                    ]
                }
        },
        {
            "id": "backend",
            "apps": [
                {
                    "id": "redis",
                    [...]
                }
        },
    ]
}
```

This seems to be the standard Marathon way to define dependencies. Nothing really fancy here :) It works straightforward :)

What I really like about the dependency stuff on sloppy is that everything is automatically reachable via internal naming conventions. In this case for example the redis server is automatically available via "redis.backend.kamelladjutant.<accountname>". That's very simple, very efficient and very nice :)

After creating a docker container for each of the components and configuring it appropriately I finally had my cluster running :)

```
hans-guenther:kamelladjutant-sloppy mop$ sloppy show kamelladjutant
|------------------------------------------------------------------------|
| Services    | # Of Apps | Running Instances | Total Memory Consumption |
|------------------------------------------------------------------------|
| frontend    | 1         | 2 from 2          | 512                      |
|------------------------------------------------------------------------|
| signaling   | 1         | 1 from 1          | 256                      |
|------------------------------------------------------------------------|
| coordinator | 1         | 3 from 3          | 768                      |
|------------------------------------------------------------------------|
| backend     | 1         | 1 from 1          | 256                      |
|------------------------------------------------------------------------|
```

Now I can scale my application cluster up and down as I want by issuing:

    hans-guenther:kamelladjutant-sloppy mop$ sloppy scale kamelladjutant/frontend/webserver 3 # set instance count to 3

# Is it scalable yet?

Right now only the webserver and the coordinator are fully scalable and that is where I am currently stuck: To make the signaling component scale every instance change must be reflected in the coordinators config (register/unregister signaling servers). To manage that I must be able to hook into the logic of bringing servers up or down. I am not sure how to do that on the fly or if that is even intended. So to scale the signaling servers I currently would have to change the sloppy JSON every time.

Another problem is the single redis instance: Currently it is the sole bottleneck. I chose redis because you can easily cluster it. However I didn't find any time yet to create a proper redis cluster :)

I am not sure if I am expecting too much: Autoscaling (for the lazy like me :D) would be great. However I don't see how sloppy would help me there yet. It seems I have to do it from the outside.

# Conclusion

While there are some minor usability problems (please provide more logging ;) ) the service is already making quite a good impression. The worst thing I discovered during the test is certainly docker hub and that is supposed to be stable ;). When testing a bit more I should really investigate why the "change" command fails for me. That is really crucial for a real application.

Some open questions which I might tackle when testing a bit more:

- How to autoscale? Does sloppy do that for me?
- How to do a rolling update (i.e. prepare new version of the whole cluster and hot swap)?
- How to propagate added/removed dependent servers into the config of another component (signaling -> coordinator)
- How to host non docker hub (private) docker images?
- Who is andreas1? (I am andreas2)
- Should I change my github profile picture to the logo of SC Fortuna Köln (one of the developers seems to be avid effzeh fan)?

As to the code I should really finish the project somewhen. It's a shame and I could still use it. I want to have a look at [redux](https://github.com/rackt/redux) anyway. Maybe seeing the project in the wild will help. Or maybe you want to help out?

Everything is open sourced:

https://github.com/m0ppers/kamelladjutant-coordinator
https://github.com/m0ppers/kamelladjutant-frontend
https://github.com/m0ppers/kamelladjutant-signaling
https://github.com/m0ppers/kamelladjutant-sloppy

Ah. And in case you are really interested to see the (I warned you. It is buggy!) result: https://kamelladjutant.sloppy.zone/#/
