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

    // Make sure positions are up-to-date
    playersParser.updateOverallPositions();

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

    // Set up event listeners for the top buttons
    document.getElementById('export-csv-top').addEventListener('click', exportToCSV);
    document.getElementById('reset-rankings-top').addEventListener('click', resetRankings);

    // Set up the upload buttons for custom Fantasy Pros cheat sheet
    document.getElementById('upload-cheat-sheet').addEventListener('click', triggerFileUpload);
    document.getElementById('upload-cheat-sheet-top').addEventListener('click', triggerFileUpload);
    document.getElementById('cheat-sheet-file').addEventListener('change', handleFileUpload);

    // Set up clear custom sheet buttons
    document.getElementById('clear-custom-sheet').addEventListener('click', clearCustomCheatSheet);
    document.getElementById('clear-custom-sheet-top').addEventListener('click', clearCustomCheatSheet);

    // Show clear buttons if using a custom sheet
    if (localStorage.getItem('custom_cheat_sheet')) {
        document.querySelectorAll('.clear-custom-btn').forEach(btn => {
            btn.style.display = 'inline-block';
        });
    }

    // Listen for tab changes to ensure UI stays updated
    const tabLinks = document.querySelectorAll('a[data-bs-toggle="tab"]');
    tabLinks.forEach(tabLink => {
        tabLink.addEventListener('shown.bs.tab', function (event) {
            const targetTab = event.target.getAttribute('aria-controls');
            console.log(`Tab changed to ${targetTab}`);
        });
    });
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
    // Ensure we have the most accurate position info
    const position = player.position || playersParser.getPlayerPosition(player.name, player.team) || "FLEX";

    // Update the player object if needed
    if (player.position !== position && position !== "FLEX") {
        player.position = position;
    }

    const card = document.createElement('div');
    card.className = `player-card`;

    // Add tag class if the player has a tag
    if (player.tag) {
        card.classList.add(`${player.tag}-tag`);
    }

    card.dataset.playerId = player.id;
    card.dataset.playerName = player.name;
    card.dataset.playerTeam = player.team;
    card.dataset.playerPosition = position;
    card.dataset.playerRank = displayRank; // Use display rank instead of player.rank
    card.dataset.playerTag = player.tag || '';

    card.innerHTML = `
        <span class="player-rank">${displayRank}</span>
        <span class="player-name">${player.name}</span>
        <span class="player-team">${player.team}</span>
        <span class="player-position">${position}</span>
        <div class="tag-controls">
            <button class="tag-btn target" title="Target" onclick="toggleTag(this, 'target')">T</button>
            <button class="tag-btn sleeper" title="Sleeper" onclick="toggleTag(this, 'sleeper')">S</button>
            <button class="tag-btn avoid" title="Avoid" onclick="toggleTag(this, 'avoid')">A</button>
            <button class="tag-btn drafted" title="Drafted" onclick="toggleTag(this, 'drafted')">D</button>
            <button class="tag-btn none" title="Clear Tag" onclick="toggleTag(this, 'none')">X</button>
        </div>
    `;

    return card;
}/**
 * Toggle a tag on a player card
 */
function toggleTag(button, tag) {
    const playerCard = button.closest('.player-card');
    const playerName = playerCard.dataset.playerName;
    const playerTeam = playerCard.dataset.playerTeam;

    // Remove all existing tag classes
    playerCard.classList.remove('target-tag', 'sleeper-tag', 'avoid-tag', 'drafted-tag');

    // Add the new tag class if it's not 'none'
    if (tag !== 'none') {
        playerCard.classList.add(`${tag}-tag`);
        playerCard.dataset.playerTag = tag;
    } else {
        playerCard.dataset.playerTag = '';
    }

    // Update the player data in the current tab
    const tabPane = playerCard.closest('.tab-pane');
    const positionKey = tabPane ? tabPane.id : 'overall';
    updatePlayerData(positionKey);

    // Sync the tag to the same player in other tabs
    syncPlayerTag(playerName, playerTeam, tag);

    // Prevent the click from triggering other events
    event.preventDefault();
    event.stopPropagation();
}

/**
 * Sync a player's tag across all tabs
 */
function syncPlayerTag(playerName, playerTeam, tag) {
    // Update the same player in all tab lists
    for (const posKey of ['overall', 'qb', 'rb', 'wr', 'te', 'k', 'dst']) {
        // Skip the current position as it's already updated
        const players = playersParser.getPlayersByPosition(posKey);

        // Find the player in this position list
        const playerIndex = players.findIndex(p =>
            p.name === playerName && p.team === playerTeam
        );

        if (playerIndex !== -1) {
            // Update the player's tag
            players[playerIndex].tag = tag;

            // Only refresh the UI for tabs other than the current one
            const tabElement = document.getElementById(`${posKey}-players`);
            if (tabElement && tabElement !== event.target.closest('.tab-pane')) {
                const cards = tabElement.querySelectorAll('.player-card');
                for (const card of cards) {
                    if (card.dataset.playerName === playerName && card.dataset.playerTeam === playerTeam) {
                        // Update the class and dataset
                        card.classList.remove('target-tag', 'sleeper-tag', 'avoid-tag', 'drafted-tag');
                        if (tag) {
                            card.classList.add(`${tag}-tag`);
                        }
                        card.dataset.playerTag = tag;
                        break;
                    }
                }
            }
        }
    }
}

/**
 * Update player rankings after a drag-and-drop operation
 */
function updatePlayerRankings(positionKey) {
    const containerElement = document.getElementById(`${positionKey}-players`);
    const playerCards = Array.from(containerElement.querySelectorAll('.player-card'));

    // Update the display rank and data-attribute
    playerCards.forEach((card, index) => {
        const displayRank = index + 1;
        const rankElement = card.querySelector('.player-rank');
        rankElement.textContent = displayRank;

        // Also update the rank data attribute to match the display order
        card.dataset.playerRank = displayRank;
    });

    // Update the player data
    updatePlayerData(positionKey);

    console.log(`Updated rankings for ${positionKey} tab. New order (first 5):`,
        playerCards.slice(0, 5).map((card, i) =>
            `${i+1}. ${card.dataset.playerName} (${card.dataset.playerTeam})`
        )
    );
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

    // If we're updating the overall tab, sync the position-specific tabs
    if (positionKey === 'overall') {
        // Add a small delay to ensure the overall list is updated first
        setTimeout(() => {
            syncPositionTabsWithOverall();
        }, 50);
    }
}

/**
 * Synchronize position-specific tabs with the overall tab order
 */
function syncPositionTabsWithOverall() {
    console.log("Syncing position tabs with overall");

    // First, update positions in the overall list to ensure accuracy
    playersParser.updateOverallPositions();

    const overallPlayers = playersParser.getPlayersByPosition('overall');

    // Create a mapping of player name+team to their rank in the overall list
    const overallRankMap = {};

    // Process players in order of their overall rank
    overallPlayers.forEach((player, index) => {
        // Get the definitive position from position lists
        const position = playersParser.getPlayerPosition(player.name, player.team);

        // Update position in overall list if needed
        if (player.position !== position && position !== "FLEX") {
            player.position = position;
        }

        const key = `${player.name}|${player.team}`;
        overallRankMap[key] = index + 1; // Use index+1 for 1-based ranking
    });

    console.log("Overall rank map created with " + Object.keys(overallRankMap).length + " players");
    console.log("First 3 overall players:", overallPlayers.slice(0, 3).map(p =>
        `${p.rank}. ${p.name} (${p.team}) - ${p.position}`
    ));    // Now update each position-specific list
    for (const posKey of ['qb', 'rb', 'wr', 'te', 'k', 'dst']) {
        // Get the existing players in this position tab
        const positionPlayers = [...playersParser.getPlayersByPosition(posKey)];

        if (positionPlayers.length === 0) {
            console.log(`Skipping ${posKey} - no players found`);
            continue;
        }

        console.log(`Processing ${posKey} - ${positionPlayers.length} players`);

        // Sort the position players based on their order in the overall list
        positionPlayers.sort((a, b) => {
            const aKey = `${a.name}|${a.team}`;
            const bKey = `${b.name}|${b.team}`;

            const aRank = overallRankMap[aKey] || 9999;
            const bRank = overallRankMap[bKey] || 9999;

            return aRank - bRank;
        });

        // Debug the first few sorted players
        console.log(`${posKey} sorted order (first 5):`,
            positionPlayers.slice(0, 5).map(p => ({
                name: p.name,
                team: p.team,
                overallRank: overallRankMap[`${p.name}|${p.team}`] || 'not found'
            }))
        );

        // Update the rank numbers
        const updatedPlayers = positionPlayers.map((player, index) => {
            return {
                ...player,
                rank: index + 1,
                id: `${posKey}-${index + 1}`
            };
        });

        // Update the data store
        playersParser.players[posKey] = updatedPlayers;

        // Update the UI
        const containerElement = document.getElementById(`${posKey}-players`);
        if (containerElement) {
            // Clear the container
            containerElement.innerHTML = '';

            // Recreate and append player cards
            updatedPlayers.forEach((player, index) => {
                const playerCard = createPlayerCard(player, index + 1);
                containerElement.appendChild(playerCard);
            });

            // Reinitialize Sortable for this container
            new Sortable(containerElement, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: function(evt) {
                    updatePlayerRankings(posKey);
                }
            });
        }
    }

    console.log("Position sync complete");
}/**
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

/**
 * Trigger file upload dialog
 */
function triggerFileUpload() {
    document.getElementById('cheat-sheet-file').click();
}

/**
 * Handle file upload for custom Fantasy Pros cheat sheet
 */
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Check if it's an HTML file
    if (!file.type.includes('html')) {
        alert('Please select an HTML file from Fantasy Pros.');
        return;
    }

    // Create a spinner or loading indicator
    showLoadingIndicator();

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            // Get the HTML content
            const htmlContent = e.target.result;

            // Save the file to the server (or store locally)
            const saveResult = await saveUploadedFile(htmlContent);

            if (saveResult) {
                // Reload the app with the new data
                await playersParser.loadDefaultData();
                initializeApp();

                // Show success message
                alert('Fantasy Pros cheat sheet uploaded successfully!');
            } else {
                throw new Error('Failed to save the uploaded file');
            }
        } catch (error) {
            console.error('Error processing uploaded file:', error);
            alert('Error processing the file. Please make sure it\'s a valid Fantasy Pros cheat sheet.');
        } finally {
            // Hide loading indicator
            hideLoadingIndicator();
            // Reset the file input
            event.target.value = '';
        }
    };

    reader.onerror = function() {
        hideLoadingIndicator();
        alert('Error reading the file. Please try again.');
        event.target.value = '';
    };

    // Read the file as text
    reader.readAsText(file);
}

/**
 * Save the uploaded file to replace the default cheat sheet
 */
async function saveUploadedFile(htmlContent) {
    try {
        // In a real app, you would send this to the server
        // For our client-side app, we'll use localStorage as a workaround
        localStorage.setItem('custom_cheat_sheet', htmlContent);

        // Update the UI to show the "Clear Custom Sheet" button
        document.querySelectorAll('.clear-custom-btn').forEach(btn => {
            btn.style.display = 'inline-block';
        });

        return true;
    } catch (error) {
        console.error('Error saving file:', error);
        return false;
    }
}

/**
 * Clear the custom cheat sheet and revert to default
 */
function clearCustomCheatSheet() {
    if (confirm('Are you sure you want to remove your custom cheat sheet and revert to the default?')) {
        // Remove the custom sheet from localStorage
        localStorage.removeItem('custom_cheat_sheet');

        // Hide the clear buttons
        document.querySelectorAll('.clear-custom-btn').forEach(btn => {
            btn.style.display = 'none';
        });

        // Reload the default data
        playersParser.loadDefaultData().then(() => {
            initializeApp();
            alert('Reverted to default cheat sheet.');
        });
    }
}/**
 * Show loading indicator
 */
function showLoadingIndicator() {
    // Create and show a loading indicator
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loading-overlay';
    loadingOverlay.style.position = 'fixed';
    loadingOverlay.style.top = '0';
    loadingOverlay.style.left = '0';
    loadingOverlay.style.width = '100%';
    loadingOverlay.style.height = '100%';
    loadingOverlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    loadingOverlay.style.display = 'flex';
    loadingOverlay.style.justifyContent = 'center';
    loadingOverlay.style.alignItems = 'center';
    loadingOverlay.style.zIndex = '9999';

    const spinner = document.createElement('div');
    spinner.className = 'spinner-border text-light';
    spinner.setAttribute('role', 'status');

    const loadingText = document.createElement('span');
    loadingText.className = 'ms-2 text-light';
    loadingText.textContent = 'Processing cheat sheet...';

    const loadingContainer = document.createElement('div');
    loadingContainer.appendChild(spinner);
    loadingContainer.appendChild(loadingText);

    loadingOverlay.appendChild(loadingContainer);
    document.body.appendChild(loadingOverlay);
}

/**
 * Hide loading indicator
 */
function hideLoadingIndicator() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
}
