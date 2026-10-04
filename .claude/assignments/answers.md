**Partial sync:**

why should backend need the whole push ?
werent in first implementation backedn apis that specifically can get only list of profiles or     
workspaces without its nested content ? by this it should be possible to decide right ?

**Rename to merge:** 

yes, only onf first contant - i do not want to loose the ability to propagate rename actions.
and if merge produces FUP limit ? - just stop and show the error to the user with advice him to audit 
or fill request to raise as mentioned in fup rules

**The devices detail page:**

yes, think system and apis for reporting

**Example data:**

yes, any change that user makes - data structure and order is no more 1:1 of prepared example data template

**Workspace limit scope:**

per profile

**A logged-out ex-premium extension over the limit:**

no, do not allow to add other content until is not under limits again

**The 5 synchronised installations:**

yes, refuse to log in with message stating why and what can be done

**Fair use over a cap through a merge:**

yes

**After upgrading:**

yes

**Open PRs:**

edit them yf you want to - maybe rename to "general-limits-refactor"

