# Fantasy Football Cheat Sheet Creator

A web application that allows you to create and customize your fantasy football draft rankings with drag-and-drop functionality.

## Features

- Drag and drop players to reorder them
- View players by position (Overall, QB, RB, WR, TE, K, DST)
- Tag players as "Target", "Sleeper", or "Avoid"
- Export your customized rankings to CSV
- Reset to default rankings

## How to Use

1. Clone or download this repository
2. Run the local server using Node.js
3. Open the application in your web browser

### Running the Server

```bash
node server.js
```

This will start a local server at http://localhost:3000.

### Using the Application

- Use the tabs at the top to switch between different position groups
- Drag and drop players to reorder them based on your preferences
- Use the tag buttons to mark players as:
  - T: Target (players you want to draft)
  - S: Sleeper (undervalued players)
  - A: Avoid (players you don't want to draft)
  - X: Clear tag
- Click "Export to CSV" to download your custom rankings
- Click "Reset Rankings" to return to the default order

## Default Data

The application uses the 2025 Fantasy Football Cheat Sheet as its default data source. This data is loaded from the `assets/sheet/Fantasy Football Cheat Sheet_ 2025.html` file.

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6)
- [Sortable.js](https://github.com/SortableJS/Sortable) for drag and drop functionality
- [Bootstrap](https://getbootstrap.com/) for UI components

## Author

Created by Travis Neilans
