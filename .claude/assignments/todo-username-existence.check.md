# Check existence of username

## Motivation

- when user is filling registration form, he should be informed that given name 
  already exists during typing

## Implementation

- use backend app agent
- implement API that will return true/false for existence of given username
- make this API only if API KEY is provided to allow it to be called only this frontend app
  - add API_KEY parameter to the frontend app
  - implement FRONTEND_API_KEY param for backend app
  - this two keys must be identical, otherwise this API should return not allowed status
- fire the api request after certain amount of inactivity when user stops typing, lets say 250ms
