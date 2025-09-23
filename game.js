// --- Game State & Elements ---

const GameState = {
    currentScreen: 'village',
    data: null,
    currentQuest: null,
    currentGroupIndex: 0,
    currentQuestionIndex: 0,
    playerHealth: 100, // Health for the current battle
    minionHealth: 100,
    currentTurn: 'player',
    isBossBattle: false,
    difficulty: 'multiple-choice',
    bossQuestionPool: [],
    shuffledQuestions: [], // New array to hold shuffled questions for the current minion
    lastMatchingResult: null, // Stores the number of correct/incorrect answers for matching
    playerCharacter: {
        health: 100, // Character's persistent health
        level: 1,
        exp: 0,
        gold: 0,
        armor: { head: 'None', upperBody: 'None', lowerBody: 'None' },
        armorHealthBonus: 0,
        weapon: 'Wooden Sword'
    },
    blacksmithInventory: []
};

function savePlayerData() {
    localStorage.setItem('anatomyRpgPlayer', JSON.stringify(GameState.playerCharacter));
    console.log('Player data saved!');
}

function loadPlayerData() {
    const savedData = localStorage.getItem('anatomyRpgPlayer');
    if (savedData) {
        GameState.playerCharacter = JSON.parse(savedData);
        console.log('Player data loaded!');
    }
}

// --- Master Item List ---
const AllArmorItems = [
    // Helmets
    { name: 'Leather Cap', type: 'head', healthBonus: 5, value: 20 },
    { name: 'Iron Helm', type: 'head', healthBonus: 10, value: 50 },
    { name: 'Steel Helmet', type: 'head', healthBonus: 15, value: 100 },
    { name: 'Mythril Helm', type: 'head', healthBonus: 25, value: 250 },
    // Upper Body Armor
    { name: 'Padded Jacket', type: 'upperBody', healthBonus: 8, value: 30 },
    { name: 'Chainmail Shirt', type: 'upperBody', healthBonus: 15, value: 75 },
    { name: 'Steel Cuirass', type: 'upperBody', healthBonus: 20, value: 150 },
    { name: 'Dragon Plate', type: 'upperBody', healthBonus: 35, value: 350 },
    // Lower Body Armor
    { name: 'Cloth Pants', type: 'lowerBody', healthBonus: 3, value: 15 },
    { name: 'Leather Leggings', type: 'lowerBody', healthBonus: 7, value: 25 },
    { name: 'Iron Greaves', type: 'lowerBody', healthBonus: 12, value: 60 },
    { name: 'Steel Greaves', type: 'lowerBody', healthBonus: 18, value: 120 }
];

const uiPanel = document.querySelector('.input-form');
const battleScreen = document.getElementById('battle-screen');
const playerStats = document.querySelector('.player-stats');
const enemyStats = document.querySelector('.enemy-stats');
const playerHealthBar = document.getElementById('player-health-bar');
const enemyHealthBar = document.getElementById('enemy-health-bar');
const playerHealthText = document.getElementById('player-health-text');
const enemyHealthText = document.getElementById('enemy-health-text');
const playerImage = document.getElementById('player-image');
const enemyImage = document.getElementById('enemy-image');
const battleLog = document.getElementById('battle-log');
const gameContainer = document.querySelector('.game-container');

// --- Main Functions ---

async function loadGameData(filenames) {
    try {
        const fetchPromises = filenames.map(file => fetch(file).then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load ${file}: ${response.statusText}`);
            }
            return response.json();
        }));
        
        GameState.data = await Promise.all(fetchPromises);
        console.log('Game data loaded successfully:', GameState.data);
    } catch (error) {
        console.error('Error loading game data:', error);
        uiPanel.innerHTML = `<p style="color:red;">Error: Could not load game data. Please check the console for details.</p>`;
    }
}

function renderScreen(screenName) {
    uiPanel.innerHTML = '';
    battleScreen.style.display = 'none';

    // Toggle a class on the game container to handle full-width layout for the village
    gameContainer.classList.toggle('village-layout', screenName === 'village');

    switch (screenName) {
        case 'village':
            renderVillage();
            break;
        case 'notice-board':
            renderNoticeBoard();
            break;
        case 'tavern':
            renderTavern();
            break;
        case 'blacksmith':
            renderBlacksmith();
            break;
        default:
            console.error('Invalid screen:', screenName);
            break;
    }
}

function renderVillage() {
    const villageImageName = 'Village';
    const { level, exp, gold, health, armor, armorHealthBonus, weapon } = GameState.playerCharacter;

    const playerMaxHealth = 100 + armorHealthBonus;

    uiPanel.innerHTML = `
        <div class="player-stats-bar">
            <p><strong>Level:</strong> ${level}</p>
            <p><strong>Exp:</strong> ${exp}</p>
            <p><strong>Gold:</strong> ${gold}</p>
            <p><strong>Health:</strong> ${playerMaxHealth}</p>
            <p><strong>Armor:</strong> ${GameState.playerCharacter.armor.head}, ${GameState.playerCharacter.armor.upperBody}, ${GameState.playerCharacter.armor.lowerBody}</p>
            <p><strong>Weapon:</strong> ${GameState.playerCharacter.weapon}</p>
        </div>
        
        <div class="village-nav">
            <h2>The Village</h2>
            <p>Welcome, adventurer. What is your next move?</p>
            <button id="notice-board-btn">Notice Board</button>
            <button id="tavern-btn">Tavern</button>
            <button id="blacksmith-btn">Blacksmith</button>
        </div>

        <div class="village-image-container">
            <img src="Images/${villageImageName}.png" alt="A simple drawing of a medieval village" width="300" height="300"/>
        </div>
    `;
    
    document.getElementById('notice-board-btn').addEventListener('click', () => renderScreen('notice-board'));
    document.getElementById('tavern-btn').addEventListener('click', () => renderScreen('tavern'));
    document.getElementById('blacksmith-btn').addEventListener('click', () => renderScreen('blacksmith'));
}

// Updated renderNoticeBoard
function renderNoticeBoard() {
    uiPanel.innerHTML = `
        <h2>Notice Board</h2>
        <p>Choose your difficulty:</p>
        <div id="difficulty-selector">
            <button data-difficulty="multiple-choice" class="difficulty-btn selected">Multiple Choice</button>
            <button data-difficulty="written" class="difficulty-btn">Written</button>
        </div>
        <p>A list of quests are pinned here. Choose your adventure!</p>
        <div id="quest-list"></div>
        <button id="back-btn">Back to Village</button>
    `;
    
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            GameState.difficulty = btn.dataset.difficulty;
        });
    });

    const questListDiv = document.getElementById('quest-list');
    
    // Loop through each loaded JSON object
    GameState.data.forEach(unit => {
        // Loop through the quests within each unit
        unit.quests.forEach(quest => {
            const questPanel = document.createElement('div');
            questPanel.className = 'quest-panel';
            questPanel.innerHTML = `
                <h3>${quest.quest_title}</h3>
                <p>${quest.quest_description}</p>
                <button class="start-quest-btn" data-unit-id="${unit.unit_id}" data-quest-id="${quest.quest_id}">Start Quest</button>
            `;
            questListDiv.appendChild(questPanel);
        });
    });
    
    document.getElementById('back-btn').addEventListener('click', () => renderScreen('village'));
    
    document.querySelectorAll('.start-quest-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const questId = e.target.dataset.questId;
            const unitId = e.target.dataset.unitId;
            initQuest(unitId, questId);
        });
    });
}

function renderTavern() {
    uiPanel.innerHTML = `
        <h2>The Drunken Dragon Inn</h2>
        <p>Welcome, adventurer. Have a seat and see who the mightiest heroes are!</p>
        <div id="leaderboard"></div>
        <button id="back-btn">Back to Village</button>
    `;

    const leaderboardDiv = document.getElementById('leaderboard');
    // For a real game, you would load this data from a server.
    // Here, we'll use a placeholder array with a few players and the current player.
    const mockLeaderboardData = [
        { 
            name: 'Your Hero',
            exp: GameState.playerCharacter.exp,
            level: GameState.playerCharacter.level,
            helmetArmor: GameState.playerCharacter.armor.head,
            upperArmor: GameState.playerCharacter.armor.upperBody,
            lowerArmor: GameState.playerCharacter.armor.lowerBody,
            weapon: GameState.playerCharacter.weapon
        },
        {
            name: 'Kaelen the Wise',
            exp: 1250,
            level: 12,
            helmetArmor: 'Steel Helmet',
            upperArmor: 'Leather Cuirass',
            lowerArmor: 'Leather Pants',
            weapon: 'Elvish Bow'
        },
        {
            name: 'Grom the Strong',
            exp: 250,
            level: 3,
            helmetArmor: 'Mail Hood',
            upperArmor: 'Iron Chestplate',
            lowerArmor: 'Iron Legguards',
            weapon: 'Steel Warhammer'
        },
        {
            name: 'Lyra the Swift',
            exp: 980,
            level: 9,
            helmetArmor: 'Obsidian Helm',
            upperArmor: 'Dragon Hide Tunic',
            lowerArmor: 'Dragon Hide Pants',
            weapon: 'Steel Daggers'
        },
    ];

    // Sort the players by experience in descending order
    mockLeaderboardData.sort((a, b) => b.exp - a.exp);

    // Create a simple table or list structure for the leaderboard
    const leaderboardHTML = `
        <table>
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Level</th>
                    <th>Total EXP</th>
                    <th>Head Armor</th>
                    <th>Upper Armor</th>
                    <th>Lower Armor</th>
                    <th>Weapon</th>
                </tr>
            </thead>
            <tbody>
                ${mockLeaderboardData.map((player, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${player.name}</td>
                        <td>${player.level}</td>
                        <td>${player.exp}</td>
                        <td>${player.helmetArmor}</td>
                        <td>${player.upperArmor}</td>
                        <td>${player.lowerArmor}</td>
                        <td>${player.weapon}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    leaderboardDiv.innerHTML = leaderboardHTML;

    document.getElementById('back-btn').addEventListener('click', () => renderScreen('village'));
}

function renderBlacksmith() {
    // Generate new inventory if the shop is empty
    if (GameState.blacksmithInventory.length === 0) {
        // Shuffle the master list and pick a few items
        const shuffledItems = shuffleArray([...AllArmorItems]);
        const numItems = 3; // Number of items to display
        GameState.blacksmithInventory = shuffledItems.slice(0, numItems);
    }

    // Generate the HTML for the shop interface
    let shopHTML = `
        <h2>Blacksmith's Forge</h2>
        <p>Welcome, adventurer. What can I get for you?</p>
        <p><strong>Your Gold:</strong> ${GameState.playerCharacter.gold}</p>
        <div id="blacksmith-items">`;

    GameState.blacksmithInventory.forEach(item => {
        const isEquipped = GameState.playerCharacter.armor[item.type] === item.name;
        const buttonText = isEquipped ? 'Equipped' : `Buy (${item.value}g)`;
        const buttonDisabled = isEquipped || GameState.playerCharacter.gold < item.value;

        shopHTML += `
            <div class="shop-item">
                <h3>${item.name}</h3>
                <p>+${item.healthBonus} Health</p>
                <p>${item.type.charAt(0).toUpperCase() + item.type.slice(1)} Armor</p>
                <button class="purchase-btn" data-item-name="${item.name}" ${buttonDisabled ? 'disabled' : ''}>${buttonText}</button>
            </div>
        `;
    });
    
    shopHTML += `
        </div>
        <button id="back-btn" style="margin-top: 20px;">Back to Village</button>
    `;

    uiPanel.innerHTML = shopHTML;
    
    // Add event listeners to the new buttons
    document.getElementById('back-btn').addEventListener('click', () => renderScreen('village'));

    document.querySelectorAll('.purchase-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const itemName = e.target.dataset.itemName;
            const itemToPurchase = AllArmorItems.find(item => item.name === itemName);

            if (itemToPurchase && GameState.playerCharacter.gold >= itemToPurchase.value) {
                // Deduct gold
                GameState.playerCharacter.gold -= itemToPurchase.value;
                
                // Update player stats and equipped armor
                const oldArmorName = GameState.playerCharacter.armor[itemToPurchase.type];
                const oldArmor = AllArmorItems.find(item => item.name === oldArmorName);

                // Subtract bonus of old armor (if any)
                if (oldArmor) {
                    GameState.playerCharacter.armorHealthBonus -= oldArmor.healthBonus;
                }

                // Add bonus of new armor
                GameState.playerCharacter.armor[itemToPurchase.type] = itemToPurchase.name;
                GameState.playerCharacter.armorHealthBonus += itemToPurchase.healthBonus;

                savePlayerData();

                // Re-render the blacksmith screen to update gold and equipped status
                renderBlacksmith();

                alert(`You purchased and equipped the ${itemToPurchase.name}!`);
            } else {
                alert('Not enough gold!');
            }
        });
    });
}

// Updated initQuest to handle multiple JSON files and dynamic health
function initQuest(unitId, questId) {
    if (!GameState.data) {
        console.error('Game data has not been loaded yet.');
        return;
    }

    let questToStart = null;
    for (const unit of GameState.data) {
        if (unit.unit_id === unitId) {
            questToStart = unit.quests.find(q => q.quest_id === questId);
            if (questToStart) {
                break;
            }
        }
    }

    if (!questToStart) {
        console.error(`Quest not found: ${questId} in unit ${unitId}`);
        return;
    }
    
    GameState.currentQuest = questToStart;
    GameState.currentQuest.groups = shuffleArray(GameState.currentQuest.groups);

    GameState.currentGroupIndex = 0;
    GameState.currentQuestionIndex = 0;
    GameState.playerHealth = GameState.playerCharacter.health + GameState.playerCharacter.armorHealthBonus;
    // Set minion health based on the number of questions in the group.
    const currentGroup = GameState.currentQuest.groups[GameState.currentGroupIndex];
    // Minion health is 10 times the number of questions.
    GameState.minionHealth = currentGroup.questions.length * 10; 
    
    enemyImage.src = GameState.currentQuest.minion_images[Math.floor(Math.random() * GameState.currentQuest.minion_images.length)] || '';
    GameState.currentTurn = 'player';
    GameState.isBossBattle = false;
    GameState.bossQuestionPool = [];
    GameState.shuffledQuestions = [];

    uiPanel.style.display = 'none';
    battleScreen.style.display = 'flex';
    
    updateBattleUI();
    startTurn();
}

// --- Battle Logic ---

function startTurn() {
    if (GameState.playerHealth <= 0) {
        endBattle('loss');
        return;
    }
    
    let currentGroup;
    if(!GameState.isBossBattle){
        currentGroup = GameState.currentQuest.groups[GameState.currentGroupIndex];
    }
    
    if (GameState.shuffledQuestions.length == 0 && !GameState.isBossBattle) {
        GameState.shuffledQuestions = shuffleArray([...currentGroup.questions]);
    }
    else if(GameState.shuffledQuestions.length == 0 && GameState.isBossBattle){
        GameState.shuffledQuestions = GameState.bossQuestionPool;
    }
    
    const currentQuestionData = GameState.shuffledQuestions[GameState.currentQuestionIndex];

    if (!currentQuestionData) {
        console.log("Error: No question data in startTurn function");
        GameState.currentQuestionIndex = 0;
        return;
    }
    
    updateBattleUI();

    if (GameState.currentTurn === 'player') {
        battleLog.textContent = "Your turn to attack! Answer the question to deal damage.";
    } else {
        battleLog.textContent = "The minion is attacking! Answer correctly to defend.";
    }

    if (currentGroup.type === 'matching') {
        renderMatchingQuestion(currentGroup.questions);
    } else {
        // This function now handles all question types based on the 'type' or 'question_type' property.
        renderQuestion(currentQuestionData);
    }
}

function startBossBattle() {
    GameState.isBossBattle = true;
    // Boss health is higher than a normal minion.
    GameState.minionHealth = 150; 
    enemyImage.src = GameState.currentQuest.boss_image || '';
    battleLog.textContent = "The final boss appears! Prepare for the ultimate challenge!";
    
    let allQuestions = [];
    GameState.currentQuest.groups.forEach(group => {
        group.questions.forEach(q => allQuestions.push(q));
    });
    GameState.shuffledQuestions = [];
    GameState.bossQuestionPool = shuffleArray(allQuestions);
    GameState.currentQuestionIndex = 0;
    updateBattleUI();
}

function renderQuestion(questionData) {
    try {
        uiPanel.style.display = 'block';
        uiPanel.innerHTML = `
            <div class="battle-ui-panel">
                <h3>Question</h3>
                <p>${questionData.question}</p>
                <div id="answer-options"></div>
            </div>
        `;

        const answerOptionsDiv = document.getElementById('answer-options');
        
        // Use question_type or a default 'multiple-choice' if not specified
        const questionType = questionData.question_type || questionData.type || GameState.difficulty;

        if (questionType === 'true/false') {
            const trueBtn = document.createElement('button');
            trueBtn.textContent = 'True';
            trueBtn.addEventListener('click', () => handleAnswer(normalizeAnswer('true'), questionData.answers.map(normalizeAnswer)));
            answerOptionsDiv.appendChild(trueBtn);

            const falseBtn = document.createElement('button');
            falseBtn.textContent = 'False';
            falseBtn.addEventListener('click', () => handleAnswer(normalizeAnswer('false'), questionData.answers.map(normalizeAnswer)));
            answerOptionsDiv.appendChild(falseBtn);
        } else if (questionType === 'multiple-choice') {
            const correctAnswers = questionData.answers;
            const allAnswers = getAllPossibleAnswers();
            let possibleAnswers = [...correctAnswers];

            while (possibleAnswers.length < 4) {
                const randomIndex = Math.floor(Math.random() * allAnswers.length);
                const randomAnswer = allAnswers[randomIndex];
                if (!possibleAnswers.includes(randomAnswer)) {
                    possibleAnswers.push(randomAnswer);
                }
            }
            possibleAnswers.sort(() => Math.random() - 0.5);

            possibleAnswers.forEach(answer => {
                const btn = document.createElement('button');
                btn.textContent = answer;
                btn.addEventListener('click', () => handleAnswer(normalizeAnswer(answer), correctAnswers));
                answerOptionsDiv.appendChild(btn);
            });
        } else if (questionType === 'written') {
             const correctAnswers = questionData.answers;
             answerOptionsDiv.innerHTML = `
                <input type="text" id="written-answer-input" placeholder="Type your answer here">
                <button id="submit-written-btn">Submit</button>
            `;
            const writtenInput = document.getElementById('written-answer-input');
            const submitBtn = document.getElementById('submit-written-btn');

            writtenInput.focus();

            writtenInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    submitBtn.click();
                }
            });

            submitBtn.addEventListener('click', () => {
                const writtenAnswer = normalizeAnswer(writtenInput.value);
                const normalizedCorrectAnswers = correctAnswers.map(normalizeAnswer);
                handleAnswer(writtenAnswer, normalizedCorrectAnswers);
            });
        } else if (questionType === 'image-hotspot') {
            const imageElement = new Image();
            imageElement.src = questionData.image_url;
            imageElement.style.width = '100%';
            imageElement.style.height = 'auto';
            imageElement.style.cursor = 'crosshair';

            imageElement.addEventListener('click', (event) => {
                const imageWidth = imageElement.offsetWidth;
                const imageHeight = imageElement.offsetHeight;
                
                const x = event.offsetX;
                const y = event.offsetY;
                
                const xPercent = (x / imageWidth) * 100;
                const yPercent = (y / imageHeight) * 100;

                console.log(`Clicked at X: ${xPercent.toFixed(2)}%, Y: ${yPercent.toFixed(2)}%`);

                let isCorrect = false;
                let foundHotspot = null;

                for (const hotspot of questionData.hotspots) {
                    if (hotspot.radius) { // Check for a circle
                        const distance = Math.sqrt(Math.pow(xPercent - hotspot.x, 2) + Math.pow(yPercent - hotspot.y, 2));
                        if (distance <= hotspot.radius) {
                            isCorrect = true;
                            foundHotspot = hotspot;
                            break;
                        }
                    } else if (hotspot.width && hotspot.height) { // Check for a square/rectangle
                        console.log(`Checking box hotspot at (${hotspot.x.toFixed(2)}, ${hotspot.y.toFixed(2)}) with dimensions ${hotspot.width.toFixed(2)}x${hotspot.height.toFixed(2)}`);
                        if (xPercent >= hotspot.x && xPercent <= hotspot.x + hotspot.width &&
                            yPercent >= hotspot.y && yPercent <= hotspot.y + hotspot.height) {
                            isCorrect = true;
                            foundHotspot = hotspot;
                            break;
                        }
                    }
                }
                
                if (isCorrect) {
                    const hotspotAnswers = foundHotspot.answers;
                    handleAnswer(normalizeAnswer(hotspotAnswers[0]), hotspotAnswers.map(normalizeAnswer));
                } else {
                    handleAnswer('incorrect_hotspot', ['wrong']);
                }
            });
            answerOptionsDiv.appendChild(imageElement);
        }
    } catch (error) {
        console.error("Error rendering question:", error);
        battleLog.textContent = "An error occurred. Missing question data.";
        setTimeout(() => endBattle('error'), 3000);
    }
}

function renderMatchingQuestion(questions) {
    uiPanel.style.display = 'block';
    uiPanel.innerHTML = `
        <div class="battle-ui-panel">
            <h3>Matching Game</h3>
            <p>Match the term on the left with its definition on the right.</p>
            <div id="matching-container"></div>
            <button id="submit-matching-btn" style="margin-top: 20px;">Submit Answers</button>
        </div>
    `;

    const matchingContainer = document.getElementById('matching-container');
    matchingContainer.style.display = 'grid';
    matchingContainer.style.gridTemplateColumns = '1fr 1fr';
    matchingContainer.style.gap = '20px';

    const shuffledQuestions = shuffleArray([...questions]);
    const shuffledAnswers = shuffleArray([...questions.map(q => q.answers[0])]);
    
    shuffledAnswers.forEach((answer, index) => {
        // Create left column (answers)
        const answerP = document.createElement('p');
        answerP.textContent = answer;
        answerP.dataset.answer = normalizeAnswer(answer);
        
        // Create right column (dropdowns)
        const select = document.createElement('select');
        select.id = `select-${index}`;
        const defaultOption = document.createElement('option');
        defaultOption.textContent = "Select a definition...";
        defaultOption.value = "";
        select.appendChild(defaultOption);

        shuffledQuestions.forEach(q => {
            const option = document.createElement('option');
            option.value = normalizeAnswer(q.question);
            option.textContent = q.question;
            select.appendChild(option);
        });

        // Append both elements to the grid container
        matchingContainer.appendChild(answerP);
        matchingContainer.appendChild(select);
    });

    document.getElementById('submit-matching-btn').addEventListener('click', () => {
        let correctCount = 0;
        let totalCount = questions.length;
        
        document.querySelectorAll('#matching-container p').forEach((answerP, index) => {
            const select = document.getElementById(`select-${index}`);
            const selectedQuestion = select.options[select.selectedIndex].textContent;
            
            const originalQuestion = questions.find(q => q.answers.includes(answerP.textContent));
            
            if (originalQuestion && normalizeAnswer(selectedQuestion) === normalizeAnswer(originalQuestion.question)) {
                correctCount++;
                select.style.border = '2px solid green';
            } else {
                select.style.border = '2px solid red';
            }
        });
        
        GameState.lastMatchingResult = {
            correct: correctCount,
            incorrect: totalCount - correctCount
        };
        
        handleAnswer('matching_completed', ['matching_completed']);
    });
}

function handleAnswer(userAnswer, correctAnswers) {
    const isCorrect = correctAnswers.includes(userAnswer);
    
    document.querySelectorAll('.battle-ui-panel button').forEach(btn => btn.disabled = true);

    const resultSpan = document.createElement('span');
    resultSpan.className = 'answer-feedback';
    resultSpan.textContent = isCorrect ? '✔️' : '❌';
    if (!isCorrect) {
        resultSpan.classList.add('incorrect');
    }
    uiPanel.querySelector('.battle-ui-panel').appendChild(resultSpan);

    let damage = 0;
    const currentGroup = GameState.currentQuest.groups[GameState.currentGroupIndex];
    
    // Determine damage based on question type and turn
    if (currentGroup.type === 'matching') {
        if (GameState.currentTurn === 'player') {
            damage = GameState.lastMatchingResult.correct * 10; // 10 damage per correct match
            battleLog.textContent = `Correct! You matched ${GameState.lastMatchingResult.correct} pairs and deal ${damage} damage!`;
            playerStats.classList.add('animate-attack');
            enemyStats.classList.add('flash');
            GameState.minionHealth -= damage;
        } else {
            damage = GameState.lastMatchingResult.incorrect * 10; // 10 damage per incorrect match
            battleLog.textContent = `Defense failed! The minion matched ${GameState.lastMatchingResult.incorrect} pairs and deals ${damage} damage!`;
            enemyStats.classList.add('animate-attack');
            playerStats.classList.add('flash');
            GameState.playerHealth -= damage;
        }
    } else { // Standard question type
        if (GameState.currentTurn === 'player') {
            playerStats.classList.add('animate-attack');
            if (isCorrect) {
                damage = 15;
                battleLog.textContent = `Correct! You strike the minion for ${damage} damage!`;
                enemyStats.classList.add('flash');
            } else {
                damage = 0;
                battleLog.textContent = "Incorrect! Your attack misses.";
                enemyStats.classList.add('jitter');
            }
            GameState.minionHealth -= damage;
        } else { // It's the enemy's turn, player is defending
            enemyStats.classList.add('animate-attack');
            damage = 10;
            if (GameState.isBossBattle) {
                damage *= 2;
            }
            
            if (isCorrect) {
                damage = 0;
                battleLog.textContent = "Successful defense! You block the attack!";
                playerStats.classList.add('jitter');
            } else {
                battleLog.textContent = `Defense failed! You take ${damage} damage!`;
                playerStats.classList.add('flash');
            }
            GameState.playerHealth -= damage;
        }
    }

    setTimeout(() => {
        // Remove all animation classes from both the player and the enemy
        playerStats.classList.remove('animate-attack', 'flash', 'jitter');
        enemyStats.classList.remove('animate-attack', 'flash', 'jitter');
        
        updateBattleUI();
        
        if (GameState.minionHealth <= 0) {
            handleMinionDefeated();
        } else if (GameState.playerHealth <= 0) {
            endBattle('loss');
        } else {
            GameState.currentQuestionIndex = (GameState.currentQuestionIndex + 1) % GameState.shuffledQuestions.length;
            GameState.currentTurn = GameState.currentTurn === 'player' ? 'enemy' : 'player';
            startTurn();
        }
    }, 1000);
}

function handleMinionDefeated() {
    battleLog.textContent = "Minion defeated!";
    
    GameState.currentGroupIndex++;
    GameState.currentQuestionIndex = 0;
    
    if (GameState.currentGroupIndex >= GameState.currentQuest.groups.length && !GameState.isBossBattle) {
        setTimeout(() => {
            startBossBattle();
            startTurn();
        }, 1500);
    } else if (GameState.currentGroupIndex >= GameState.currentQuest.groups.length && GameState.isBossBattle) {
        endBattle('win');
    } else {
        setTimeout(() => {
            const nextGroup = GameState.currentQuest.groups[GameState.currentGroupIndex];
            // Minion health is 10 times the number of questions.
            GameState.minionHealth = nextGroup.questions.length * 10;
            enemyImage.src = GameState.currentQuest.minion_images[Math.floor(Math.random() * GameState.currentQuest.minion_images.length)] || '';
            GameState.shuffledQuestions = [];
            updateBattleUI();
            startTurn();
        }, 1500);
    }
}

function getXPRequiredForLevel(level) {
    const baseXP = 50;
    const exponent = 2;
    return baseXP * (level * level);
}

function checkLevelUp() {
    const nextLevel = GameState.playerCharacter.level + 1;
    const requiredExp = getXPRequiredForLevel(nextLevel);

    if (GameState.playerCharacter.exp >= requiredExp) {
        GameState.playerCharacter.level = nextLevel;
        // The remaining XP carries over to the next level
        GameState.playerCharacter.exp = GameState.playerCharacter.exp - requiredExp;
        console.log(`Congratulations! You have reached level ${nextLevel}!`);
        alert(`You have leveled up to level ${nextLevel}!`);
        // Check if the player can level up again immediately
        checkLevelUp();
    }
}

function endBattle(outcome) {
    let expGained = 0;
    let goldGained = 0;

    // Get the number of question groups from the current quest
    const numGroups = GameState.currentQuest.groups.length;

    // Define base reward values per group
    const baseExpPerGroup = 10;
    const baseGoldPerGroup = 5;

    if (outcome === 'win') {
        // Calculate rewards based on the number of groups
        expGained = baseExpPerGroup * numGroups;
        goldGained = baseGoldPerGroup * numGroups;
        battleLog.textContent = `You have defeated all the enemies! Quest complete! You gain ${expGained} EXP and ${goldGained} Gold.`;

        GameState.blacksmithInventory = [];
    } else {
        // Calculate rewards based on the number of groups
        expGained = baseExpPerGroup * 0.2 * numGroups;
        goldGained = baseGoldPerGroup * 0.2 * numGroups;
        battleLog.textContent = `You have been defeated... returning to town. You gain ${expGained} EXP and ${goldGained} Gold.`;
    }

    GameState.playerCharacter.exp += expGained;
    GameState.playerCharacter.gold += goldGained;
    GameState.playerCharacter.health = 100 + GameState.playerCharacter.armorHealthBonus;

    checkLevelUp();

    savePlayerData();

    console.log("Player Status:", GameState.playerCharacter);

    setTimeout(() => {
        battleScreen.style.display = 'none';
        uiPanel.style.display = 'block';
        renderScreen('village');
    }, 3000);
}

function getAllPossibleAnswers() {
    const allAnswers = [];
    GameState.currentQuest.groups.forEach(group => {
        group.questions.forEach(question => {
            if (question.answers) {
                allAnswers.push(...question.answers);
            } else if (question.hotspots) {
                question.hotspots.forEach(hotspot => {
                    allAnswers.push(...hotspot.answers);
                });
            }
        });
    });
    return [...new Set(allAnswers)].map(normalizeAnswer);
}

function normalizeAnswer(answer) {
    return answer.trim().toLowerCase();
}

function updateBattleUI() {
    const playerMaxHealth = GameState.playerCharacter.health + GameState.playerCharacter.armorHealthBonus;
    playerHealthBar.style.width = `${(GameState.playerHealth / playerMaxHealth) * 100}%`;
    const currentGroup = GameState.currentQuest.groups[GameState.currentGroupIndex];
    // Minion max health is 10 times the number of questions.
    const minionMaxHealth = currentGroup.questions.length * 10;
    enemyHealthBar.style.width = `${(GameState.minionHealth / minionMaxHealth) * 100}%`;
    playerHealthText.textContent = `HP: ${GameState.playerHealth}/${playerMaxHealth}`;
    enemyHealthText.textContent = `HP: ${GameState.minionHealth}/${minionMaxHealth}`;
}

// Fisher-Yates shuffle algorithm to randomize an array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Utility function to log click coordinates for debugging hotspots
function debugHotspots(imageElement) {
    imageElement.addEventListener('click', (event) => {
        const rect = imageElement.getBoundingClientRect();
        const x = event.offsetX;
        const y = event.offsetY;
        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;
        console.log(`Clicked at X: ${x.toFixed(2)}, Y: ${y.toFixed(2)} (Percent: X: ${xPercent.toFixed(2)}%, Y: ${yPercent.toFixed(2)}%)`);
    });
}

// --- Initializer ---

document.addEventListener('DOMContentLoaded', async () => {
    await loadGameData(['Unit2Chapter5.json', 'Unit2Chapter6.json', 'Unit2Chapter7.json', 'Unit3Chapter9.json']);
    loadPlayerData();
    
    if (GameState.data && GameState.data.length > 0) {
        renderScreen(GameState.currentScreen);
    }
});
