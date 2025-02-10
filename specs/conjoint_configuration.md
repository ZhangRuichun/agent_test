We are going to Conjoint Configuration in the navigation bar. It should be placed between Digital Shelves and Run Survey. 

User story: 
As a User, I can visit a screen to configure the conjoint survey parameters for a selected Digital Shelf, so that I can select the optimal number of levels and combinations of product and price are shown in the consumer-facing conjoint survey and in the simulated AI-facing conjoint survey.  The goal is to create enough variation in configurations to get a meaningful result about utility scores for each product-price combination and thus effectively simulate consumer preference share, but not have so many combinations as to require an unrealistically high required n to get a significant sample.  We should link this screen from the Digital Shelf item as a third button by Configure Personas and Configure Products buttons.  

The parameters that should be adjustable by the user are:
* How many price levels between low price and high price should be shown (default 3 - low, med and high)
* Display how many choice combinations will be generated given selected number of products and levels and the corresponding time required for the consumer to complete the survey
* Show a table of the configured choices that will be delivered to the consumer.  Use Fractional Factorial design to create the Design of Experiment (DOE) so that we are reducing the number of combinations to the minimum necessary
