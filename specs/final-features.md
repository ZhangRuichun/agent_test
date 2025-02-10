We are going to refactor part of the application and complete the human survey functionality. Start with the following:
- In the Questions page add a button for New Question that opens a dialog.  In the dialog have a form to capture Question, Answer Type [SINGLE, MULTIPLE, NUMBER, TEXT], Options (if SINGLE, MULTIPLE]
- In the Questions page show a table of all questions. For each question have an action button that has actions to Edit and Delete a question.   Clicking Edit opens the dialog and allows the user to edit the question.  Clicking Delete marks the question status DELETED in the database and it no longer shows in any list
- On the Digital Shelf page add two buttons in each Shelf item: Config Personas and Config Products. Config Personas opens a dialog that has a multi-select interface to select the Personas to be tested in this Shelf.  The Config Products similarly opens a dialog to select the products to test on this shelf. 
- On the New Product dialog and in the db and API, add fields to capture Benefits, Cost and Low Price and High Price in addition to the existing List Price field.
- In the Run Survey page we are going to simplify the page.  The user will still select a Shelf and will provide a Run Name with the current functionality.  Remove the fields to select products or consumers.  instead when the user click Run Simulation use the product and person lists from the selected shelf.  Below the Run button provide a link with a button to copy to the clipboard that links to the survey page with a unique id for the Survey page (which we will create in a next step)

Note that you have recently already made the following changes - do not repeat these changes - they are here for reference only:
- In the db and all associated code, rename the table consumers to personas 
- Add a table in the db for questions 
- Add a many-to-many relationship in the db between Shelf and Products. Add another many-to-many between Shelf and Personas.
- - rename the Human Panel page to Questions
- Rename the Synthetic Panel page to Personas
- Move the Digital Shelf page below Products, Personas and Questions in the sideman