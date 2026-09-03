# TODOS

Things that comes to my mind during solving other shits and should be done


## User experience

### Bring synchroniation into chrome extension finally
- as we said and did, synchronization is going to be performed using obtained sync code
- chrome extension have menu widget in top panel on the right (three dots)
  - there should appear menu items like "Log in", "Register", and "Enter sync code" for user that is not logged in (extension that is not synced)
  - for logged in user, there should be items like "Log out"
- If user is logging into extension that have some links already added to the same profile as "data on the backend", then:
  - merge groups and links, implement some separate class or module handling migration logic
  - if there are for example two exact same links with exact same name in the same group or subgroup, do not add them duplicitly
  - in another case, if there are two duplicates with differen name, keep both
- connect to a backend according to specification
- connect to the websocket link or implement it if it is not implemented on backend yet - the websocket should only perform ping if there is new content on the backend for given user
  - this user experience is primarily in case user rusn mutiple browsers or workstations at once
- otherwise check for new content only when browser first opened, then websocket should work i guess - i do not want to wreck my backend by requesting endpoint that should provide info
  if there is something new on each tab open
  - check who has new content - if it is extension or backend and merge respectivelly
- if content changes in some computer or browser (new link, rename, order change, anything that changes data), then send that change to the backend in the moment when it happens
  - make this somehow non-blocking the user if for example is currently offline


### Device name
- for work after synchronization is implemented into chrome extension actually
- implement device (or rather say installation ?) name to each chrome extension that user is installing typed by user alongside connection code
- make it required
- if user type name that is already in device list as online, show him warning and ask him what to do (cancel / rename / overwrite)
- if is in list but as logged out:
  - will not be counted into free account limits
  - just inform user (after connection) that this device was once logged out (welcome back)

### Back buttons
- especially in sections like cookies & gdpr which are not in top menu, back button is more than expected

### Implement GDPR bullshit
- TODO description

### Implement Cookies bullshit
- TODO description

## Critical architecture steps, missing parts

### User payment & pro features activation
- basic features are unlimited amount of links and groups and subgroups, but workspaces are limited to 2, profile to 1 and connected devices to 10
- explore how chrome store works and how to pair user with user payment
- explore how to check if payment is still in charge - user will probably be paying monthly


# DONE

### Connection code copy to clipboard widget
- small square with rounded corners icon next to the connection code with scissors logo
- done: a square accent button carrying U+2702 sits beside the code and copies it with the
  Clipboard API; both outcomes are worded in the view-model and announced in a live region,
  because the API can refuse for reasons that have nothing to do with the page
