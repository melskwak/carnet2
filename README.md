# carnet

## what the project is

carnet is a private travel guide web application. ‘carnet’ is the french word for a small notebook or travel log. the application acts as a digital interactive book for organizing travel plans and memories.

## why i made it

i built carnet to track my travel experiences in a private space. logging measurable achievements and seeing clear progression motivates me. this application allows me to log journeys, document climbing routes, and organize sightseeing spots clearly. it keeps my memories organized without relying on generic applications.

## how i made it

i built this application entirely with native web technologies. html creates the book layout. css handles the visual theme and page turning animations. javascript drives the user interactions. the localstorage api saves user data directly to the browser for persistent offline access in a single unified data store. custom javascript using the canvas api renders the interactive color wheel. the filereader api processes local image uploads and handles data backups. the application operates with full editing rights always enabled. this removes the previous need for separate profiles or guest access.

## project organization

the application functions like a book with distinct navigational layers.

- **start menu**: this initial interface provides tools for importing data, exporting data, and toggling the display theme.
- **global level**: the globe icon opens this master list. it stores high level country bookmarks.
- **country level**: selecting a country moves the bookmark to the left page. the right page displays a customizable image and an expanding text box for general trip details.
- **category level**: each country contains six specific sub categories. these are cities, districts, dining, shopping, sightseeing, and climbing. clicking a category opens a detailed list on the left page.
- **item level**: selecting a specific item reveals a dedicated image and description box on the right page. items also feature toggle buttons for ‘favorite’ and ‘wishlist’ statuses. city and district items contain nested sub lists to further organize locations.

