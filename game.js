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
    playerCharacter: {
        health: 100, // Character's persistent health
        level: 1,
        exp: 0,
        gold: 0,
        armor: { head: 'None', upperBody: 'None', lowerBody: 'None' },
        weapon: 'Wooden Sword'
    }
};

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
        default:
            console.error('Invalid screen:', screenName);
            break;
    }
}

function renderVillage() {
    const villageImageName = 'Village';
    const { level, exp, gold, health, armor, weapon } = GameState.playerCharacter;

    uiPanel.innerHTML = `
        <div class="player-stats-bar">
            <p><strong>Level:</strong> ${level}</p>
            <p><strong>Exp:</strong> ${exp}</p>
            <p><strong>Gold:</strong> ${gold}</p>
            <p><strong>Health:</strong> ${health}/100</p>
        </div>
        
        <div class="village-nav">
            <h2>The Village</h2>
            <p>Welcome, adventurer. What is your next move?</p>
            <button id="notice-board-btn">Notice Board</button>
            <button id="tavern-btn">Tavern</button>
            <button id="blacksmith-btn">Blacksmith</button>
            <button id="doctor-btn">Doctor</button>
        </div>

        <div class="village-image-container">
            <img src="Images/${villageImageName}.png" alt="A simple drawing of a medieval village" width="300" height="300"/>
        </div>
    `;
    
    document.getElementById('notice-board-btn').addEventListener('click', () => renderScreen('notice-board'));
    document.getElementById('tavern-btn').addEventListener('click', () => console.log('Navigated to Tavern'));
    document.getElementById('blacksmith-btn').addEventListener('click', () => console.log('Navigated to Blacksmith'));
    document.getElementById('doctor-btn').addEventListener('click', () => console.log('Navigated to Doctor'));
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

// Updated initQuest to handle multiple JSON files
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

    GameState.currentGroupIndex = 0;
    GameState.currentQuestionIndex = 0;
    GameState.playerHealth = GameState.playerCharacter.health;
    GameState.minionHealth = 100;
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
    
    var currentGroup;
    if(!GameState.isBossBattle){
        currentGroup = GameState.currentQuest.groups[GameState.currentGroupIndex];
    }
    
    if (GameState.shuffledQuestions.length == 0 && !GameState.isBossBattle) {
        GameState.shuffledQuestions = shuffleArray([...currentGroup.questions]);
    }
    else if(GameState.shuffledQuestions.length == 0 && GameState.isBossBattle){
        GameState.shuffledQuestions = GameState.bossQuestionPool;
    }
    
    var currentQuestionData = GameState.shuffledQuestions[GameState.currentQuestionIndex];

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
        renderQuestion(currentQuestionData);
    }
}

function startBossBattle() {
    GameState.isBossBattle = true;
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
    
    //GameState.currentGroupIndex = GameState.currentQuest.groups.length - 1;
    
    //setTimeout(startTurn, 2000);
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
        
        const questionType = questionData.type || 'multiple-choice';

        if (questionType === 'multiple-choice') {
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
                
                // Add logging to show the click and hotspot coordinates
                //console.log(`Clicked at X: ${xPercent.toFixed(2)}%, Y: ${yPercent.toFixed(2)}%`);
                //console.log('--- Checking Hotspots ---');

                let isCorrect = false;
                let foundHotspot = null;

                for (const hotspot of questionData.hotspots) {
                    //console.log(`Hotspot: x:${hotspot.x}%, y:${hotspot.y}%, w:${hotspot.width}%, h:${hotspot.height}%`);

                    if (hotspot.radius) { // Check for a circle
                        const radius_percent = (hotspot.radius / imageWidth) * 100;
                        const distance = Math.sqrt(Math.pow(xPercent - hotspot.x, 2) + Math.pow(yPercent - hotspot.y, 2));
                        if (distance <= hotspot.radius) {
                            isCorrect = true;
                            foundHotspot = hotspot;
                            break;
                        }
                    } else if (hotspot.width && hotspot.height) { // Check for a square/rectangle
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
        let isCorrect = true;
        
        document.querySelectorAll('#matching-container p').forEach((answerP, index) => {
            const select = document.getElementById(`select-${index}`);
            const selectedQuestion = select.options[select.selectedIndex].textContent;
            
            const originalQuestion = questions.find(q => q.answers.includes(answerP.textContent));
            
            if (originalQuestion && normalizeAnswer(selectedQuestion) !== normalizeAnswer(originalQuestion.question)) {
                isCorrect = false;
                // Optional: provide visual feedback for incorrect matches
                select.style.border = '2px solid red';
            } else {
                select.style.border = '2px solid green';
            }
        });
        
        handleAnswer(isCorrect ? 'correct' : 'incorrect', ['correct']);
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

    if (GameState.currentTurn === 'player') {
        playerStats.classList.add('animate-attack');
        if (isCorrect) {
            battleLog.textContent = "Correct! You strike the minion!";
            enemyStats.classList.add('flash');
            GameState.minionHealth -= 20;
        } else {
            battleLog.textContent = "Incorrect! Your attack misses.";
            enemyStats.classList.add('jitter');
        }
        setTimeout(() => {
            playerStats.classList.remove('animate-attack');
            enemyStats.classList.remove('flash', 'jitter');
            updateBattleUI();
            
            if (GameState.minionHealth <= 0) {
                handleMinionDefeated();
            } else {
                GameState.currentQuestionIndex = (GameState.currentQuestionIndex + 1) % GameState.shuffledQuestions.length;
                GameState.currentTurn = 'enemy';
                startTurn();
            }
        }, 1000);
    } else { // It's the enemy's turn, player is defending
        enemyStats.classList.add('animate-attack');
        let damage = 20;
        if (GameState.isBossBattle) {
            damage *= 2;
        }
        
        if (isCorrect) {
            battleLog.textContent = "Successful defense! You block the attack!";
            playerStats.classList.add('jitter');
        } else {
            battleLog.textContent = `Defense failed! You take ${damage} damage!`;
            playerStats.classList.add('flash');
            GameState.playerHealth -= damage;
        }
        setTimeout(() => {
            enemyStats.classList.remove('animate-attack');
            playerStats.classList.remove('flash', 'jitter');
            updateBattleUI();
            GameState.currentQuestionIndex = (GameState.currentQuestionIndex + 1) % GameState.shuffledQuestions.length;
            GameState.currentTurn = 'player';
            startTurn();
        }, 1000);
    }
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
            GameState.minionHealth = 100;
            //get a random minion image
            enemyImage.src = GameState.currentQuest.minion_images[Math.floor(Math.random() * GameState.currentQuest.minion_images.length)] || '';
            GameState.shuffledQuestions = [];
            updateBattleUI();
            startTurn();
        }, 1500);
    }
}

function endBattle(outcome) {
    let expGained = 0;
    let goldGained = 0;

    if (outcome === 'win') {
        expGained = 50;
        goldGained = 20;
        battleLog.textContent = `You have defeated all the enemies! Quest complete! You gain ${expGained} EXP and ${goldGained} Gold.`;
    } else {
        expGained = 10;
        battleLog.textContent = `You have been defeated... returning to town. You gain ${expGained} EXP.`;
    }

    GameState.playerCharacter.exp += expGained;
    GameState.playerCharacter.gold += goldGained;
    GameState.playerCharacter.health = 100;
    //GameState.playerCharacter.health = GameState.playerHealth;

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
    playerHealthBar.style.width = `${GameState.playerHealth}%`;
    enemyHealthBar.style.width = `${GameState.minionHealth}%`;
    playerHealthText.textContent = `HP: ${GameState.playerHealth}/100`;
    enemyHealthText.textContent = `HP: ${GameState.minionHealth}/100`;
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
    
    if (GameState.data && GameState.data.length > 0) {
        renderScreen(GameState.currentScreen);
    }
});