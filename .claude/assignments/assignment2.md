# Implementing frontend project

## Instructions / requests

- we will build frontend for some functionalities of connected backend app, but not all for now - the backend 
  is used mainly to hold chrome extension data that may exists on multiple browsers / machines in sync for given user
- do not style page, add empty css rules, I want to style page myself by hand, I have not page identity decided yet
- save all strings in json in some place I want to have i18n in my page for english and slovak language

## Page layout - user not yet logged in

- make simple web page with top menu containing: 
  - Page title
  - nav menu "Home | Download | Register | Login"
- then main content page 
- then footer should containd things like:
  - GDPR compliance
  - Cookies compliance
  - Sitemap
  - Author (My) name and link to my webpage (kovo.space) with copyright sign and year

Following sections are the content of main page content:

### Home section

Presentation of what this chrome extension is, leave blank or fill lorem ipsum

### Download page 

There should be link to google chrome store or direct download of crx 
(just links, self hosted version of crx will be hosted in this project public folder)

### Register

This is registration form for creating new user. 
Implement according to the backend needs. Have a look at the flow of logging using google and obtaining pairing code. 
Decide if put it here under registration procedure or should it go into "login".

### Login 

Login form for admin section of page

## Page layout - user logged in

### Changes compared to non-logged user page:

- nav menu: "Home | Download | My Devices | Account"
 
### My devices

list of devices where extension was installed, based on what informations 
that are provided from the backend - at least device and browser, the last sync time

### Account 

page for mamaging user account, at lest what backend permits and is possible

## Updates to sssignment1

- restrict agent to create and push only branches ```feature/**``` or ```bugfix```
