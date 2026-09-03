# TODOS

Things that comes to my mind during solving other shits and should be done


## User experience

### Device name
- implement device (or rather say installation ?) name to each chrome extension that user is installing typed by user alongside connection code
- make it required
- if user type name that is already in device list as online, show him warning and ask him what to do (cancel / rename / overwrite)
- if is in list but as logged out:
  - will not be counted into free account limits
  - just inform user (after connection) that this device was once logged out (welcome back)

### Connection code copy to clipboard widget
- small square with rounded corners icon next to the connection code with scissors logo


## Critical architecture steps, missing parts

### User payment & pro features activation
- basic features are unlimited amount of links and groups and subgroups, but workspaces are limited to 2, profile to 1 and connected devices to 10
- explore how chrome store works and how to pair user with user payment
- explore how to check if payment is still in charge - user will probably be paying monthly
