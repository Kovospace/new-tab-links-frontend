# Basic settings for Claude and Agents

## Developer agent

Create agent that will be in role of developer of this project.
His obligation is not only to develop the current project, but to answer questions that other agents may query - for example
impact of changes in another projects (like backend) to this project.

Connected projects:
- backend app:
  - local: /home/kovo/IdeaProjects/new-tab-links-backend
  - repo: https://github.com/Kovospace/new-tab-links-backend
- chrome extension:
  - local: /home/kovo/IdeaProjects/NewTabGroupedLinks
  - repo: https://github.com/K0V0/NewTabGroupedLinks

## Project basics

This project will be Angular application frontend for presentation and hosting the actual product that is chrome extension app.
This project supplies some functionalities that I do not want to put into chrome extension itself because of design
and architecture decisions for easier maintainability.

## skills

If needed to debloat claude.md and contenxt to save tokens

## Principles to follow

- SOLID principles
- Model-view-viewModel pattern, I do not want to see any data transformations in presentation layer (templates)
- human readable code
- javadoc everywhere
- don't be affraid of rather having long variables / methods / classes names that helps programmer
  to guess its functionality and goal solely by name
- put significant knowledge on features or debug that requires lot of work into memory
- document changes into claude.md, skills and other claude features if it gains processing speed or lower processing cost
  and better context in the future
- personally do not like long methods and spaghetti code, split into multiple methods usable somewhere else
  use util classes or create second service
- I do not like extremly long classes too
- Minimize token usage, if something could be offloaded to skills or other claude features

## Final words

For now, perform just Angular installation with one helloworld index.html blank page