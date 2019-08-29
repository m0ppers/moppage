+++
title = "Upgrading docker containers with attached data"
date = 2016-01-31
[taxonomies]
tags = ["docker",
  "arangodb",
  "migration "]
+++
Being able to just kill a docker container and start up a fresh container with a new version of your application is nice but what if you have data attached to it? For example if you launch a database via docker? Or if your application has some userdata in its filesystem (for example images users uploaded) which need some kind of migration step before the new version can be run (for example generate a new thumbnail size) ?

While this post might be a case of "stating the obvious" I was really surprised to not find plenty of material concerning this topic and especially nothing related to the major databases (which change their data format from time to time and need an upgrade).  

So here is how I would do it :) I will use [arangodb](http://www.arangodb.org) but this workflow should be valid for anything having some data attached to the container.

## Docker volumes

Attached container data should be placed in docker volumes. Docker volumes reside outside the normal docker layered file system. They are placed on the host. Since 1.9.0 there is even a separate command `docker volume` to manage these volumes.

While it is excellently documented, many people (including my former self) seem to not really be aware that docker volumes are more than "Yeah understood. I can mount a host volume into the container using -v and I am done".

Docker images declare their volumes inside the `Dockerfile`. Whenever you launch a docker container using for example `docker run -d --name arangodb arangodb/arangodb:2.7.5` all volumes declared in the image will be created on the host filesystem.

```
docker@default:~$ docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             VIRTUAL SIZE
arangodb/arangodb   2.7.5               221948f0d01c        6 days ago          439.8 MB
docker@default:~$ docker inspect 221948f0d01c | grep Volumes -A 5
        "Volumes": {
            "/var/lib/arangodb": {},
            "/var/lib/arangodb-apps": {},
            "/var/lib/arangodb-foxxes": {},
            "/var/log/arangodb": {}
        },
```

As we can see arangodb defines 4 volumes. What happens if we delete the container?

```
docker@default:~$ docker run -d --name arangodb arangodb/arangodb:2.7.5
2e16cd19ac368f7faf3507531b30fe25c768f23abdcfb4046af36cc0fd23241e
docker@default:~$ docker volume ls
DRIVER              VOLUME NAME
local               4f6fb398062d94730df27323429ee63f158df6d8c907df170249ee1a0f7dd73a
local               eb8236015ae58558156d52c96f0b8948f5e303f5144c185ad80386111fb1f402
local               ad96ff29c42eac148c7054f5311d820c0d6281ac66ad8f74414b66e537adf407
local               3f0ecf4d6a12d776fa7cce58ff49317b92f9754204540e6ea386b23a50b16203
docker@default:~$ sudo ls -1 /var/lib/docker/volumes/
3f0ecf4d6a12d776fa7cce58ff49317b92f9754204540e6ea386b23a50b16203
4f6fb398062d94730df27323429ee63f158df6d8c907df170249ee1a0f7dd73a
ad96ff29c42eac148c7054f5311d820c0d6281ac66ad8f74414b66e537adf407
eb8236015ae58558156d52c96f0b8948f5e303f5144c185ad80386111fb1f402
docker@default:~$ docker rm -f arangodb
arangodb
docker@default:~$ sudo ls -1 /var/lib/docker/volumes/
3f0ecf4d6a12d776fa7cce58ff49317b92f9754204540e6ea386b23a50b16203
4f6fb398062d94730df27323429ee63f158df6d8c907df170249ee1a0f7dd73a
ad96ff29c42eac148c7054f5311d820c0d6281ac66ad8f74414b66e537adf407
eb8236015ae58558156d52c96f0b8948f5e303f5144c185ad80386111fb1f402
```

What we have just seen is:

![](docker-volume.jpg)

RISE OF THE ZOMBIE VOLUMES!

To remove a container with its volumes: `docker rm -v <container-name>`.

While this probably does not happen to docker pros I think there are many people who are not aware of this.

Read the [docker volume](https://docs.docker.com/engine/userguide/dockervolumes/) documentation. It is very well written and worth the read :)

After sheding some light on volumes we will now use these to manage our data.

## Running (and upgrading) arangodb in production

Create a "data-only container" to hold your data. This container will not actually run arangodb.

```
docker@default:~$ docker create --name arangodb-data arangodb/arangodb:2.7.5 /bin/true
b2acb7a8670986132b4039719ffbeb34c6f6cc1eec546f367ec1b49c558e750c
```

This container is our initial reference to the volumes arangodb needs.

We can refer and reuse these volumes when creating our real arangodb container:

```
docker@default:~$ docker run --volumes-from arangodb-data -p 8529:8529 -d --name arangodb arangodb/arangodb:2.7.5
fb24a35858ef7173101d252c81dfbc1b341b0b3768da4f6f3386a346d496df3d
docker@default:~$ docker logs arangodb

starting ArangoDB in stand-alone mode
creating initial user, please wait ...
2016-01-31T20:48:43Z [15] INFO permanently changing the gid to 999
2016-01-31T20:48:43Z [15] INFO permanently changing the uid to 999
========================================================================
ArangoDB User: "root"
ArangoDB Password: "wf6ON2Y9W4amcNMs"
========================================================================
2016-01-31T20:48:49Z [40] INFO permanently changing the gid to 999
2016-01-31T20:48:49Z [40] INFO permanently changing the uid to 999
```

So now our arangodb is running. As it happens arangodb 2.8.0 was released last week. What if we want to upgrade? Simply delete the old docker container and fire up the new one. Again we simply use the volumes from our data-only container :)

```
docker@default:~$ docker run --volumes-from arangodb-data -p 8529:8529 -d --name arangodb arangodb/arangodb:2.8.0
docker@default:~$ docker logs arangodb

starting ArangoDB in stand-alone mode
2016-01-31T20:55:37Z [15] FATAL Database '_system' needs upgrade. Please start the server with the --upgrade option
More error details may be provided in the logfile '/var/log/arangodb/arangod.log'
```

Oops. We need a real migration step here (adapt this to your application/database or whatever). Again we can simply reuse the volumes of our data-only container and run a once-only migration step:

```
docker@default:~$ docker rm -f arangodb
arangodb
docker@default:~$ docker run --volumes-from arangodb-data --rm arangodb/arangodb:2.8.0 standalone --upgrade

starting ArangoDB in stand-alone mode
```

Now the upgrade is done and we can finally run our fresh arangodb 2.8.0.

```
docker@default:~$ docker run --volumes-from arangodb-data -p 8529:8529 -d --name arangodb arangodb/arangodb:2.8.0
a530518478f83f5ab41a38359ea46869325695245da7280aca5049dc27e2973e
docker@default:~$ curl -u root:wf6ON2Y9W4amcNMs http://127.0.0.1:8529/_api/version --dump -
HTTP/1.1 200 OK
Server: ArangoDB
Connection: Keep-Alive
Content-Type: application/json; charset=utf-8
Content-Length: 37

{"server":"arango","version":"2.8.0"}
```

Hate zombies! Love volumes!