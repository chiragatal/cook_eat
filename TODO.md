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
- [x] I should be able to add photos, videos, links, notes, ratings, reviews, and tags
- [x] This post should be able to be edited
- [x] Option to share a post as a link

### Post Create++

- [x] Rich text editor for the description
- [x] For ingredients, newline is automatically converted to a new ingredient, basically adding multiple ingredients at once by copy pasting
- [x] Also make ingredients editable, like steps
- [x] A big text field where I can paste the recipe from somewhere else, and it will be converted to the post format
- [x] Add links section
- [x] On the full post, show the buttons for editing and deleting the post and public/private status

### Post list

- [x] In the post list, show the time needed
- [x] It should expand the post when I click on it
- [x] On expansion, show the ingredients
- [x] Also show a button in the expanded view, to view the full recipe
- [x] Ingredients should be of the format "\<name> * \<quantity>"
- [x] Add search functionality

### Deployment

- [x] Deploy the app
- [x] Make the app available for public use

### Reactions

- [x] Users should be able to react to a post
- [x] Reaction users list

### What I want to cook

- [x] There should be a "what I want to cook" page
- [x] This can be automatically done based on the reactions

### Bookmarks (Favorites)

- [x] This can be automatically done based on the reactions
- [x] Users should be able to bookmark posts
- [x] Users should be able to unbookmark posts
- [x] Users should be able to view all their bookmarks

### Usability improvements

- [x] Mobile friendly
- [x] Dark mode

### Old Bugs

- [x] Images are not showing up
- [x] The post list does not show the description in rich text format
- [x] The user name is not clickable in the post list
- [x] Double description in expanded post
- [x] Header colors on the full recipe page in dark mode look incorrect. Also in the hamburger menu.
- [x] Scrolling vertically by starting the scroll on images is not working
- [x] Image upload is not working
- [x] Add multiple ingredients at once is not working on mobile
- [x] Can add multiple steps at once by copy pasting them together in new lines
- [x] The ingredient name and amount is not fitting well on the mobile
- [x] The image scrolling in the carousel is not smooth on mobile. It works fine by clicking the arrows, but not when swiping. It need not follow the speed of the swipe.
- [x] Notifications are broken

### Calendar

- [x] Add a calendar for tracking
- [x] The post should show up in the calendar
- [ ] The Full calendar is not working and not looking so nice
- [ ] The "what I cooked" and "what I want to cook" should be per user
- [ ] Add support to make the cooked date for the same recipe multiple times

### Filters

- [ ] Multiple filters
- [ ] There should be sections, the top one would be all filters matching, and the second one would be some filters matching
- [ ] Negative filters, like "not this tag"
- [ ] Nutritional filters
- [ ] Time filters
- [ ] Global filters which are always applied

### Notifications

- [x] Allow users to disable notifications for specific types of notifications
- [x] Reaction notifications
- [x] Comment notifications
- [x] Reactions on comments notifications
- [x] Tagging other users in comments
- [ ] Email notifications
- [ ] Preferences for email notifications

### Followers

- [ ] Option to follow and unfollow other users
- [ ] Following list
- [ ] Followers list
- [ ] Notification support for new posts by following users

### Shopping list

- [ ] Users should be able to add items to their shopping list
- [ ] Users should be able to remove items from their shopping list
- [ ] Users should be able to view their shopping list
- [ ] Users should be able to clear their shopping list
- [ ] Users should be able to add some/all items to the shopping list from a post
- [ ] Support to add items to the shopping list for the whole week plan
- [ ] Tick off items from the shopping list

### Week plan

- [ ] Select and assign dishes that I want to cook for the week
- [ ] Show the week plan in a calendar
- [ ] Show the week plan in a list
- [ ] Add support to add recipes to the week plan
- [ ] Add support to remove recipes from the week plan
- [ ] Add support to edit the week plan
- [ ] Add support to move recipes in the week plan
- [ ] Show what I have to cook today, and a peak of what I have to cook tomorrow

### Cook mode

- [ ] Auto show the ingredients in the current step
- [ ] Also show a peak of the next step in the cook mode
- [ ] Auto start timers
- [ ] Ability to add/subtract from the timer

### Recipe improvements

- [ ] Support for images for steps
- [ ] Support for sections for ingredients and steps
- [ ] Support for servings

### General improvements

- [ ] Images in comments

### Smart features

- [ ] Voice input for creating recipes
- [ ] Voice for reacing out the recipe
- [ ] Cook along
- [ ] Auto detect nutritional information
- [ ] Auto create week plan based on the recipes I cooked and the recipes I want to cook and the ingredients I have
- [ ] Cartoonish diagramatic view of the recipe like a flowchart
- [ ] Auto detect if the recipe is already in the database, when creating a new recipe
- [ ] MCP server

### Tests

- [x] Add automated tests
- [ ] Remove mock implementations from the tests to actually test the code
- [ ] Add tests for the mobile
- [ ] Negative tests
- [ ] Enable more linting errors instead of ignoring them
- [ ] End to End tests
- [ ] Start to finish user journey test

### Optimisations

- [ ] Limit the number of posts that are loaded at the same time
- [ ] Don't fetch the notifications in a loop. Fetch on new page load or refresh or when I open the notifications section
- [ ] Get the reactions and other things from the cloud in a single request
- [ ] On the home page, load just the first image in the carousel, fetch the others a little later

### Bugs

- [ ] When I share a user, the link is not working
- [ ] Fix the logo and the favicon
- [ ] The drag and drop for ingredients, steps and images is not working well on mobile. It works, but it is not clear. And a lot of times it gets accidentally removed.
- [ ] For any long press tooltip or the 3 dot menu on mobile, when clicking outside it, it gets closed, but it registers as a click on whatever I clicked on. Ideally it should just close the tooltip/menu.
