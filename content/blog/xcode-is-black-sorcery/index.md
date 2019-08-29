+++
title = "xcode is black sorcery"
date = 2015-05-29
[taxonomies]
tags = ["xcode",
  "syncthing",
  "syncthing-bar",
  "open source"]
+++
Wow. Just wow. I knew that maintaining an open source project is some work. While I am totally happy with my syncthing bar others drop in feature requests. I am currently focusing on different projects myself (maybe I find time later this year to fulfill the feature requests). However I already got 2 totally valid pull requests and this is a different matter and I try to merge them quickly.

AND THEN THERE IS XCODE: It is total black magic to me. It happened two times now without any obvious reason: https://forum.syncthing.net/t/syncthing-bar-for-os-x/1582/27.

NOTHING. ABSOLUTELY NOTHING HAS BEEN CHANGED IN XCODE. Now it happened again. I ran my mkrelease script which uses the standard packager to create a pkg file. Installed the new package, hit the icon - DANG - CRASH. Looking at the trace "Main storyboard could not be found". WTF! It ran successfully in xcode but after creating the pkg it suddenly won't? What kind of black sorcery is this.

From a stackoverflow post I learned that the "target membership" of the window and the storyboard might be a reason for this. Checking that everything was correctly set up I unchecked and rechecked the target membership anyway and see what: Suddenly the files were marked as modified (https://github.com/m0ppers/syncthing-bar/commit/f7a67659e24dfec56c90889071a8471212380eb1). When repackaging and reinstalling everything was in place.

W T F

I mean I only have 2 cases to check manually after releasing. How is this supposed to work in a real project?! What am i doing wrong? What kind of black sorcery is that?
