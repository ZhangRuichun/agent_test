# Optishelf Agent Specification

## Purpose of Application
The Optishelf Agent application allows Marketers to develop a "Digital Shelf" lineup of products to test with either human consumers or LLM-powered synthetic consumers in order to identify which product ideas, product benefits, packaging design and pricing will drive the strongest consumer preference and optimal profitability for a product category.  This tool is used by consumer packaged goods (CPG) brand managers (Marketers) to help come up with and test new product ideas and optimize their marketing and pricing strategies.

## User Stories
1. Digital Shelf Setup - As Marketer, I can specify the items to be presented in the Digital Shelf Survey.  For each item, I can enter a Brand Name, a Product Name, a Product Description, upload a Packaging Image and provide a List Price.  I can also click Product Generator and enter a Brand Name and prompt to have GPT-4o generate a list of product ideas with Product Name, Product Description and AI-generated Product Image and starting List Price. I can select from the generated product ideas to populate the Digital Shelf.
2. Digital Shelf Survey - Interface presents to a Human Consumer a lineup of products on a virtual store shelf with branding, product name, packaging design, price and product description and asks the Consumer to select the preferred product. Upon entering the interface, the Consumer is asked a set of demographic questions first.  Then a sequence of shelf lineups are presented each time varying the packaging design or price and asking for the Consumer to selected the preferred item.
3. Synthetic Consumer Simulation - As a Marketer, I can create one or more Synthetic Consumers for use in simulated testing of the Digital Shelf.  For each Synthetic Consumer, I describe their demographics and demand spaces (specific situations that drive different product preferences).  I then specify for each product in the Shelf what range of prices to test as a range of percentage below and above List Price  Once I have specified my set of Synethic Consumers and the test parameters, I can click a button to "Run Simulation" after which the model presents the Digital Shelf Survey sequence to each and GPT-4o using the description of the consumer makes the appropriate selection as that consumer.
4. Digital Shelf Analysis - As a Marketer, I can view a set of tables and charts that summarizes the expressed preferences of the Synthetic or Human Consumers based on the Digital Shelf Survey.

## Data Model
Shelf
  description: Each Digital Shelf Setup creates a new Shelf entity which respresents a project that is being worked by a Marketer
  fields:
    - ID
    - Project Name
    - Description

Shelf Variant
  description: The given configuration of the Digital Shelf presented to a Respondant in each variation of the shelf
  fields:
    - ID
    - ShelfID - foreight key
    - ProductLineup - JSON array of Products with ProductImageID, Price, Description for each
  
Product
  description: Each Product placed in the Shelf 
  fields:
    - ID
    - ShelfID - foreign key
    - Brand Name
    - Product Name
    - Decription
    - List Price

Product Image
  description: Each Product can have multiple Product Images
  fields:
    - ID
    - ProductID - foreign key
    - URL
    - ordinal - order of display of Product Images for a given Product

Synthetic Consumer
  description: Profile of consumer to be simulatedd in the Synthetic Consumer Simulation
  fields:
    - ID
    - Name
    - Demographics
    - Demand Spaces
    
Respondant
  description: The entity that is responding to the survey - can be either Human Consumer or Synthetic Consumer
  fields:
    - ID
    - Type - [HUMAN | SYNTHETIC]
    - SythenticConsumerID - optional foreign key
    
Response
  description: An individual survey question response from a Respondant
  fields:
    - ID
    - RespondantID - foreign key
    - ShelfVariantID - foreign key
    - SelectedProductID - foreign key

## User Interfaces
The User Stories will be implemented with the following UI screens:
* Shelf Setup - UI to support Digital Shelf Setup user story
* Product Management - UI to allow configuration of products in a given Shelf
* Simulation Management - UI to allow configuration of the Synethetic Consumer simulation
* Consumer Survey - UI for the Human Consumer to take the Digital Shelf Survey
* Synthetic Simulation - UI for the Marketer to set up and execute the Synthetic Consumer Simulation
* Analytics - UI for the Marketer to analyze the results of the Digital Shelf Survey (both Consuemr and Synthetic Respondants)

## Security Model
* Marketers are required to be registered and logged in as a User in the system to use any of the Marketer-focused interfaces.
* Human Consumers access the Digital Shelf Survey via a direct link and will NOT but required to register or log in to access this interface.  These users are NOT stored in the Users table and they will not be allowed to register for the application.  They are anonymous.