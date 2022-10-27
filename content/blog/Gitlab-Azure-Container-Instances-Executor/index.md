+++
title = "Gitlab Azure Container Instances Executor"
date = 2019-12-23
[taxonomies]
tags = ["gitlab",
  "docker",
  "hetzner",
  "jenkins",
  "azure", "container"]
+++

In the last weeks I finalized something that might be of interest to more than just me:

**Gitlab ACI executor**

<!-- more -->

## What does it do?

Gitlab comes with a super powerful and easy to use CI and offers some shared runners by default which are not really fast but do their job. However if you are doing special stuff (I am doing some Vulkan graphics project) the standard shared runners might not be approriate. Luckily you can [start your own runners and integrate them into gitlab](https://docs.gitlab.com/runner/).

## Runner vs Executor

The wording can be confusing a bit so lets clarify:

- A runner can have multiple executors
- A runner will talk to gitlab and coordinate work to its executors
- the executor will execute a job (i.e. a build job within a stage defined in .gitlab-ci.yml)

## Executors

There are quite a few executors available. There are simple executors like `shell` which just run the job locally (much like a jenkins slave).

Furthermore there is the docker executor which isolates the job within a docker container.

Finally there is even a docker-machine executor which will manage VMs on cloud providers and schedule work on these.

This should allow most use cases. However in my project things are a bit different:

- GPU requirements
- Heavy C++ projekt
- Irregular commits (personal project - only when time allows it)

The shared runners are simply not capable to handle the workload and starting up virtual machines on the fly takes time and is also quite expensive.

As time and material are available for free (considering that I am the resource - please note that I would never recommend something like this in a business scenario ;) ) lets try something different:

Lets spawn Azure Container Instances that do the work.

Containers are quickly spawned, are cheaper than VMs and Azure also allows GPUs attached to them (note that GPU container are NOT quickly spawned. They probably launch a VM in the background).

## Gitlab ACI Custom Executor

Gitlab also has so called "Custom executors". These are merely bash scripts on the runner machine. They provide an example for launching [lxc containers](https://docs.gitlab.com/runner/executors/custom_examples/lxd.html).

So what I did was to create a custom executor that integrates gitlab CI with Azure Container Instances.

```
build:
  stage: build
  script: make -j8
  variables:
    IMAGE: m0ppers/my-build-image
    AZ_CPUS: 8
    AZ_MEM: 4
```

I can now specify which "machine" I want to be provisioned for my job using the variables section of the gitlab CI. Please note the `IMAGE`. Normally you specify a docker image within the normal job declaration. However there is an open bug that this information is not being spreaded to the custom executor so you have to use the special `IMAGE` variable.

If I want to run a job on the host machine (for example if I want to build a docker container) I can simply say:

```
  variables:
    RUN_ON_HOST: 1
```

Seems interesting to you? Try it out here: [https://gitlab.com/m0ppers/gitlab-aci-executor](https://gitlab.com/m0ppers/gitlab-aci-executor)

## Technical background

- Gitlab CI jobs are GOBS (good old bash scripts :S) and require `gitlab-runner` on the machine (or container) to download artifacts/handle cache
- ACIs require a long running process to start the container

What I did to combine these two: I created a [base image](https://gitlab.com/m0ppers/gitlab-aci-executor/blob/master/Dockerfile) that runs a `sshd` as a process. I can then just pipe the gitlab job script to it. When starting the container the custom executor will make sure that the ssh key of the host machine will be allowed so that this works out.

As a result all images used by this executor have to be derived from this base image. An alternative approach would be to use `az container exec` and start the docker container using a `sleep 10000000` command or so. Not sure yet if this is worth to change. This currently works for me(tm) :).

The runner itself also needs to run somewhere. I chose the smallest instance of VPS that the hetzner cloud had available :). The costs of this setup are probably a lot less than with docker machine et al.

The downside:

Once again I got distracted and invested time into something else than the project I should be focusing on :|.

## Small presentation

I also gave a short talk about this at DevHouseFriday a few weeks ago:

[https://docs.google.com/presentation/d/1MHu1LeGkiZbudVh54kp9eMOovDtRN_BoqyA43XK08LE/edit#slide=id.g75b03973f4_2_11](https://docs.google.com/presentation/d/1MHu1LeGkiZbudVh54kp9eMOovDtRN_BoqyA43XK08LE/edit#slide=id.g75b03973f4_2_11)
