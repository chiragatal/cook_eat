# Cook Eat

I want to create a web app to track what I am cooking.

## Features

### Authentication

- [x] For now, there can be only one user
- [x] The user should be able to login and logout
- [x] The user should be able to sign up
- [x] There should be a "forgot password" feature (not needed for now)

### Access control

- [x] A post can be private or public
- [x] There should be access control for the posts
- [x] A user should not be able to edit or delete another user's post
- [x] There can be an admin user that can view all posts and edit or delete any post (Not needed for now)

### What I cooked: Posts

A post is basically a recipe.

- [x] Create a new "post" for what I cooked
- [x] This post should have a title, description, and a list of ingredients
- [ ] I should be able to add photos, videos, links, notes, ratings, reviews, and tags
- [x] This post should be able to be edited
- [x] Option to share a post as a link

### Post Create++

- [x] Rich text editor for the description
- [ ] Voice input for the post
- [ ] For ingredients, newline is automatically converted to a new ingredient
- [ ] Also make ingredients editable, like steps
- [ ] A big text field where I can paste the recipe from somewhere else, and it will be converted to the post format
- [ ] Add links section
- [x] On the full post, show the buttons for editing and deleting the post and public/private status

### Post list

- [x] In the post list, show the time needed
- [x] It should expand the post when I click on it
- [x] On expansion, show the ingredients
- [x] Also show a button in the expanded view, to view the full recipe
- [ ] Ingredients should be of the format "\<name> * \<quantity>"

### Calendar

- [x] Add a calendar for tracking
- [x] The post should show up in the calendar
- [ ] The "what I cooked" and "what I want to cook" should be per user
- [ ] Add support to make the cooked date for the same recipe multiple times

### Deployment

- [x] Deploy the app
- [x] Make the app available for public use

### Reactions

- [x] Users should be able to react to a post
- [ ] Reaction users list

### What I want to cook

- [x] There should be a "what I want to cook" page
- [x] This can be automatically done based on the reactions

### Search

- [x] Add search functionality
- [ ] Multiple filters
- [ ] There should be sections, the top one would be all filters matching, and the second one would be some filters matching

### Bookmarks (Favorites)

- [x] This can be automatically done based on the reactions
- [x] Users should be able to bookmark posts
- [x] Users should be able to unbookmark posts
- [x] Users should be able to view all their bookmarks

### Shopping list

- [ ] Users should be able to add items to their shopping list
- [ ] Users should be able to remove items from their shopping list
- [ ] Users should be able to view their shopping list
- [ ] Users should be able to clear their shopping list
- [ ] Users should be able to add some/all items to the shopping list from a post

### Usability improvements

- [x] Mobile friendly
- [x] Dark mode

## Bugs

- [ ] When I share a user, the link is not working
- [ ] The Full calendar is not working and not looking so nice
- [ ] Images are not showing up
- [ ] The post list does not show the description in rich text format
- [x] The user name is not clickable in the post list
