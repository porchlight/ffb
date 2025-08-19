/**
 * Fantasy Football Cheat Sheet Creator
 * Main application script
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Load player data
    const loadingResult = await playersParser.loadDefaultData();
    if (!loadingResult) {
        alert('Error loading player data. Please refresh the page to try again.');
        return;
    }

    // Initialize the app
    initializeApp();
});

/**
 * Initialize the app
 */
function initializeApp() {
    // Get all player data
    const players = playersParser.getAllPlayers();

    // Create player cards and initialize drag-and-drop for each position
    populatePlayerList('overall', players.overall);
    populatePlayerList('qb', players.qb);
    populatePlayerList('rb', players.rb);
    populatePlayerList('wr', players.wr);
    populatePlayerList('te', players.te);
    populatePlayerList('k', players.k);
    populatePlayerList('dst', players.dst);

    // Set up event listeners for the buttons
    document.getElementById('export-csv').addEventListener('click', exportToCSV);
    document.getElementById('reset-rankings').addEventListener('click', resetRankings);
}

/**
 * Populate a player list for a specific position
 */
function populatePlayerList(positionKey, playersList) {
    const containerElement = document.getElementById(`${positionKey}-players`);

    // Clear the container
    containerElement.innerHTML = '';

    // Create and append player cards
    playersList.forEach((player, index) => {
        const playerCard = createPlayerCard(player, index + 1);
        containerElement.appendChild(playerCard);
    });

    // Initialize Sortable.js for drag-and-drop functionality
    new Sortable(containerElement, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: function(evt) {
            updatePlayerRankings(positionKey);
        }
    });
}

/**
 * Create a player card element
 */
function createPlayerCard(player, displayRank) {
    const card = document.createElement('div');
    card.className = `player-card ${player.tag ? player.tag + '-tag' : ''}`;
    card.dataset.playerId = player.id;
    card.dataset.playerName = player.name;
    card.dataset.playerTeam = player.team;
    card.dataset.playerPosition = player.position;
    card.dataset.playerRank = player.rank;
    card.dataset.playerTag = player.tag || '';

    card.innerHTML = `
        <span class="player-rank">${displayRank}</span>
        <span class="player-name">${player.name}</span>
        <span class="player-team">${player.team}</span>
        <span class="player-position">${player.position}</span>
        <div class="tag-controls">
            <button class="tag-btn target" title="Target" onclick="toggleTag(this, 'target')">T</button>
            <button class="tag-btn sleeper" title="Sleeper" onclick="toggleTag(this, 'sleeper')">S</button>
            <button class="tag-btn avoid" title="Avoid" onclick="toggleTag(this, 'avoid')">A</button>
            <button class="tag-btn none" title="Clear Tag" onclick="toggleTag(this, 'none')">X</button>
        </div>
    `;

    return card;
}

/**
 * Toggle a tag on a player card
 */
function toggleTag(button, tag) {
    const playerCard = button.closest('.player-card');

    // Remove all existing tag classes
    playerCard.classList.remove('target-tag', 'sleeper-tag', 'avoid-tag');

    // Add the new tag class if it's not 'none'
    if (tag !== 'none') {
        playerCard.classList.add(`${tag}-tag`);
        playerCard.dataset.playerTag = tag;
    } else {
        playerCard.dataset.playerTag = '';
    }

    // Update the player data
    const positionKey = playerCard.closest('.tab-pane').id;
    updatePlayerData(positionKey);

    // Prevent the click from triggering other events
    event.stopPropagation();
}

/**
 * Update player rankings after a drag-and-drop operation
 */
function updatePlayerRankings(positionKey) {
    const containerElement = document.getElementById(`${positionKey}-players`);
    const playerCards = Array.from(containerElement.querySelectorAll('.player-card'));

    // Update the display rank
    playerCards.forEach((card, index) => {
        const rankElement = card.querySelector('.player-rank');
        rankElement.textContent = index + 1;
    });

    // Update the player data
    updatePlayerData(positionKey);
}

/**
 * Update the player data after changes
 */
function updatePlayerData(positionKey) {
    const containerElement = document.getElementById(`${positionKey}-players`);
    const playerCards = Array.from(containerElement.querySelectorAll('.player-card'));

    // Update the players array
    const updatedPlayers = playerCards.map((card, index) => {
        return {
            id: card.dataset.playerId,
            rank: index + 1,
            name: card.dataset.playerName,
            team: card.dataset.playerTeam,
            position: card.dataset.playerPosition,
            tag: card.dataset.playerTag || ''
        };
    });

    // Update the players parser data
    playersParser.players[positionKey] = updatedPlayers;
}

/**
 * Export the current rankings to a CSV file
 */
function exportToCSV() {
    const players = playersParser.getAllPlayers();
    let csvContent = 'Position,Rank,Name,Team,Tag\n';

    // Add overall list
    players.overall.forEach(player => {
        csvContent += `Overall,${player.rank},${player.name},${player.team},${player.tag}\n`;
    });

    // Add QB list
    players.qb.forEach(player => {
        csvContent += `QB,${player.rank},${player.name},${player.team},${player.tag}\n`;
    });

    // Add RB list
    players.rb.forEach(player => {
        csvContent += `RB,${player.rank},${player.name},${player.team},${player.tag}\n`;
    });

    // Add WR list
    players.wr.forEach(player => {
        csvContent += `WR,${player.rank},${player.name},${player.team},${player.tag}\n`;
    });

    // Add TE list
    players.te.forEach(player => {
        csvContent += `TE,${player.rank},${player.name},${player.team},${player.tag}\n`;
    });

    // Add K list
    players.k.forEach(player => {
        csvContent += `K,${player.rank},${player.name},${player.team},${player.tag}\n`;
    });

    // Add DST list
    players.dst.forEach(player => {
        csvContent += `DST,${player.rank},${player.name},${player.team},${player.tag}\n`;
    });

    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'fantasy-football-rankings.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Reset rankings to the default order
 */
function resetRankings() {
    if (confirm('Are you sure you want to reset all rankings to the default order?')) {
        // Reload the default data
        playersParser.loadDefaultData().then(() => {
            // Reinitialize the app
            initializeApp();
        });
    }
}
