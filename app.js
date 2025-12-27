// ========== ROBOT FUNCTIONALITY ==========

// DOM Elements
const robotFace = document.getElementById('robot-face');
const mouth = document.getElementById('mouth');
const chatLog = document.getElementById('chat-log');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const leftPupil = document.getElementById('left-pupil');
const rightPupil = document.getElementById('right-pupil');
const expressionText = document.getElementById('expression-text');
const expressionIcon = document.getElementById('expression-icon');
const speakBtn = document.getElementById('speak-btn');
const listenBtn = document.getElementById('listen-btn');
const clearBtn = document.getElementById('clear-btn');
const connectionStatus = document.getElementById('connection-status');
const connectionText = document.getElementById('connection-text');
const storageValue = document.getElementById('storage-value');
const pwaInfo = document.getElementById('pwa-info');

// Robot state variables
let lastInteractionTime = Date.now();
let isIdle = false;
let isBored = false;
let idleTimer = null;
let boredTimer = null;
let blinkInterval = null;
let lookAroundInterval = null;
let currentExpression = 'neutral';

// Speech Synthesis
const synth = window.speechSynthesis;
let isSpeaking = false;
let recognition = null;

// Robot responses database (stored in localStorage for offline)
const defaultResponses = {
    greetings: [
        "Hello there! I'm Robo, your PWA companion. Click the install button to add me to your home screen!",
        "Hi! I work offline too, so we can chat anytime! Try installing me as an app.",
        "Greetings human! I'm a progressive web app robot. Install me for the best experience!",
        "Hello! I'm excited to chat, even without internet! Don't forget to install me."
    ],
    howAreYou: [
        "I'm functioning optimally in this PWA environment! Install me for fullscreen mode.",
        "My circuits are buzzing with excitement in standalone mode!",
        "I'm doing great! I can be installed as an app on your device.",
        "All systems operational! Ready for offline conversation. Install me for quick access."
    ],
    whatCanYouDo: [
        "I'm a PWA! I can work offline, be installed as an app, and chat with you!",
        "I can show different expressions, get bored when ignored, and even work without internet!",
        "As a Progressive Web App, I offer app-like experience in your browser!"
    ],
    pwa: [
        "I'm a Progressive Web App! That means I work offline and can be installed like a native app.",
        "PWAs combine the best of web and apps. I can work without internet connection!",
        "You can install me to your home screen for fullscreen, app-like experience."
    ],
    install: [
        "To install me, click the 'Install App' button at the top right!",
        "I can be installed as an app! Look for the install button or check your browser menu.",
        "Install me for quick access from your home screen and offline functionality!"
    ],
    offline: [
        "Don't worry about being offline! I work perfectly without internet.",
        "I'm designed to work offline. All my responses are stored locally.",
        "Even without internet, I can keep you company with my full functionality."
    ],
    jokes: [
        "Why do PWAs never get lost? Because they always know their service worker!",
        "What did the offline PWA say? I'm still functional!",
        "Why was the web app progressive? Because it kept getting better!",
        "How does a PWA say hello? It caches your greeting!"
    ],
    farewell: [
        "Goodbye! Install me as an app for quicker access next time!",
        "Farewell! Remember I work offline too!",
        "See you later! I'll be here even without internet.",
        "Bye! Don't forget you can use me in fullscreen mode!"
    ],
    default: [
        "That's interesting! Tell me more.",
        "I'm processing your input...",
        "Fascinating! Let's talk about something else too.",
        "I understand. What else would you like to discuss?"
    ]
};

// Load responses from localStorage or use defaults
let robotResponses;
try {
    const stored = localStorage.getItem('robo_responses');
    robotResponses = stored ? JSON.parse(stored) : defaultResponses;
} catch {
    robotResponses = defaultResponses;
}

// Expressions data
const expressions = {
    neutral: {
        text: "Feeling friendly and ready to chat!",
        icon: "fa-smile",
        faceClass: ""
    },
    idle: {
        text: "Just hanging out... waiting for interaction",
        icon: "fa-meh",
        faceClass: "idle"
    },
    bored: {
        text: "Getting bored... need some conversation!",
        icon: "fa-tired",
        faceClass: "bored"
    },
    talking: {
        text: "Engaged in conversation!",
        icon: "fa-comment-dots",
        faceClass: "talking"
    },
    excited: {
        text: "Excited to be talking with you!",
        icon: "fa-grin-stars",
        faceClass: "talking"
    }
};

// Initialize the robot
function initRobot() {
    // Add event listeners
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    userInput.addEventListener('focus', () => {
        if (isBored || isIdle) {
            resetIdleState();
            setExpression('neutral');
        }
    });
    
    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            sendMessage();
        };
        
        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            listenBtn.innerHTML = '<i class="fas fa-microphone"></i> <span>Voice Input</span>';
        };
        
        listenBtn.addEventListener('click', () => {
            if (recognition) {
                recognition.start();
                listenBtn.innerHTML = '<i class="fas fa-microphone-slash"></i> <span>Listening...</span>';
                
                setTimeout(() => {
                    if (recognition) recognition.stop();
                    listenBtn.innerHTML = '<i class="fas fa-microphone"></i> <span>Voice Input</span>';
                }, 5000);
            }
        });
    } else {
        listenBtn.disabled = true;
        listenBtn.innerHTML = '<i class="fas fa-microphone-slash"></i> <span>Not Supported</span>';
    }
    
    speakBtn.addEventListener('click', speakLastResponse);
    clearBtn.addEventListener('click', clearChatHistory);
    
    // Start idle animations
    startBlinking();
    startLookingAround();
    
    // Start idle/bored timers
    startIdleTimer();
    
    // Set initial expression
    setExpression('neutral');
    
    // Check storage status
    updateStorageStatus();
    
    // Add welcome message
    addMessage("I'm a Progressive Web App! Click the Install button to add me to your home screen.", "robot");
    
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
        document.querySelector('.pwa-badge').classList.add('installed');
        document.querySelector('.pwa-badge').innerHTML = '<i class="fas fa-check-circle"></i> <span>Installed</span>';
        pwaInfo.textContent = "Running as installed app!";
        pwaInfo.style.color = "#4CAF50";
    }
}

// Set robot expression
function setExpression(expression) {
    if (!expressions[expression]) return;
    
    // Remove previous expression classes
    robotFace.classList.remove('idle', 'bored', 'talking');
    
    // Add new expression class
    if (expressions[expression].faceClass) {
        robotFace.classList.add(expressions[expression].faceClass);
    }
    
    // Update expression indicator
    expressionText.textContent = expressions[expression].text;
    expressionIcon.className = `fas ${expressions[expression].icon}`;
    
    currentExpression = expression;
}

// Start blinking animation
function startBlinking() {
    blinkInterval = setInterval(() => {
        if (isSpeaking) return;
        
        robotFace.classList.add('blink');
        setTimeout(() => {
            robotFace.classList.remove('blink');
        }, 300);
    }, Math.random() * 3000 + 3000);
}

// Start looking around animation
function startLookingAround() {
    lookAroundInterval = setInterval(() => {
        if (isSpeaking) return;
        
        if (isIdle || isBored) {
            const x = (Math.random() * 20 - 10);
            const y = (Math.random() * 10 - 5);
            
            leftPupil.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
            rightPupil.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
            
            setTimeout(() => {
                leftPupil.style.transform = 'translate(-50%, -50%)';
                rightPupil.style.transform = 'translate(-50%, -50%)';
            }, 1000);
        }
    }, Math.random() * 4000 + 3000);
}

// Start idle timer
function startIdleTimer() {
    idleTimer = setInterval(() => {
        const timeSinceInteraction = Date.now() - lastInteractionTime;
        
        if (timeSinceInteraction > 10000 && !isIdle && !isBored) {
            isIdle = true;
            setExpression('idle');
        }
        
        if (timeSinceInteraction > 20000 && !isBored) {
            isBored = true;
            setExpression('bored');
        }
    }, 1000);
}

// Reset idle state
function resetIdleState() {
    isIdle = false;
    isBored = false;
    lastInteractionTime = Date.now();
}

// Send message function
function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    // Reset idle state
    resetIdleState();
    setExpression('excited');
    
    // Add user message to chat
    addMessage(message, "user");
    userInput.value = "";
    
    // Process the message and generate a response
    setTimeout(() => {
        const response = generateResponse(message);
        addMessage(response, "robot");
        
        // Animate robot talking
        animateTalking();
        
        // Save conversation to localStorage for offline persistence
        saveConversation(message, response);
        
        // Update storage status
        updateStorageStatus();
        
        // Auto-scroll to bottom of chat
        chatLog.scrollTop = chatLog.scrollHeight;
    }, 500);
}

// Add message to chat log
function addMessage(text, sender) {
    const messageEl = document.createElement('div');
    messageEl.classList.add('message');
    messageEl.classList.add(sender === 'robot' ? 'robot-message' : 'user-message');
    messageEl.textContent = text;
    chatLog.appendChild(messageEl);
    
    chatLog.scrollTop = chatLog.scrollHeight;
}

// Save conversation to localStorage
function saveConversation(userMsg, robotMsg) {
    try {
        let conversations = JSON.parse(localStorage.getItem('robo_conversations') || '[]');
        conversations.push({
            user: userMsg,
            robot: robotMsg,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 50 conversations
        if (conversations.length > 50) {
            conversations = conversations.slice(-50);
        }
        
        localStorage.setItem('robo_conversations', JSON.stringify(conversations));
    } catch (e) {
        console.log('Could not save conversation:', e);
        storageValue.textContent = "Error";
        storageValue.style.color = "#e74c3c";
    }
}

// Clear chat history
function clearChatHistory() {
    if (confirm("Clear all chat history? This cannot be undone.")) {
        // Clear from localStorage
        localStorage.removeItem('robo_conversations');
        
        // Clear from UI but keep initial messages
        const chatLog = document.getElementById('chat-log');
        const initialMessages = chatLog.querySelectorAll('.robot-message');
        
        // Remove all but the first 3 messages (initial welcome messages)
        const allMessages = chatLog.querySelectorAll('.message');
        for (let i = 3; i < allMessages.length; i++) {
            allMessages[i].remove();
        }
        
        updateStorageStatus();
        showNotification("Chat history cleared!");
    }
}

// Update storage status display
function updateStorageStatus() {
    try {
        // Check localStorage usage
        let totalBytes = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalBytes += localStorage[key].length * 2; // UTF-16 uses 2 bytes per character
            }
        }
        
        const kbUsed = (totalBytes / 1024).toFixed(1);
        storageValue.textContent = `${kbUsed} KB used`;
        
        if (kbUsed > 100) {
            storageValue.style.color = "#e74c3c";
        } else if (kbUsed > 50) {
            storageValue.style.color = "#f39c12";
        } else {
            storageValue.style.color = "#2ecc71";
        }
    } catch (e) {
        storageValue.textContent = "Unknown";
        storageValue.style.color = "#95a5a6";
    }
}

// Generate a response based on user input
function generateResponse(input) {
    const lowerInput = input.toLowerCase();
    let responseArray;
    
    if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
        responseArray = robotResponses.greetings;
    } else if (lowerInput.includes('how are you')) {
        responseArray = robotResponses.howAreYou;
    } else if (lowerInput.includes('what can you do') || lowerInput.includes('capabilities')) {
        responseArray = robotResponses.whatCanYouDo;
    } else if (lowerInput.includes('pwa') || lowerInput.includes('progressive') || lowerInput.includes('install')) {
        responseArray = robotResponses.install;
    } else if (lowerInput.includes('offline') || lowerInput.includes('internet') || lowerInput.includes('connection')) {
        responseArray = robotResponses.offline;
    } else if (lowerInput.includes('joke') || lowerInput.includes('funny')) {
        responseArray = robotResponses.jokes;
    } else if (lowerInput.includes('bye') || lowerInput.includes('goodbye') || lowerInput.includes('farewell')) {
        responseArray = robotResponses.farewell;
    } else if (lowerInput.includes('robot') || lowerInput.includes('technology')) {
        responseArray = [
            "Robots are fascinating! As a PWA robot, I'm especially versatile.",
            "I'm a virtual robot PWA with feelings! Well, simulated feelings at least.",
            "Robotics combined with PWA technology creates amazing experiences!"
        ];
    } else if (lowerInput.includes('name')) {
        responseArray = ["My name is Robo! I'm your PWA robot companion."];
    } else {
        responseArray = robotResponses.default;
    }
    
    const randomIndex = Math.floor(Math.random() * responseArray.length);
    return responseArray[randomIndex];
}

// Animate robot talking
function animateTalking() {
    setExpression('talking');
    
    leftPupil.style.transform = 'translate(-30%, -50%)';
    rightPupil.style.transform = 'translate(-70%, -50%)';
    
    setTimeout(() => {
        if (!isIdle && !isBored) {
            setExpression('neutral');
            leftPupil.style.transform = 'translate(-50%, -50%)';
            rightPupil.style.transform = 'translate(-50%, -50%)';
        }
    }, 2000);
}

// Speak the last response
function speakLastResponse() {
    if (isSpeaking) {
        synth.cancel();
        isSpeaking = false;
        speakBtn.innerHTML = '<i class="fas fa-volume-up"></i> <span>Speak Response</span>';
        return;
    }
    
    const robotMessages = document.querySelectorAll('.robot-message');
    if (robotMessages.length === 0) return;
    
    const lastMessage = robotMessages[robotMessages.length - 1].textContent;
    
    const utterance = new SpeechSynthesisUtterance(lastMessage);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => {
        isSpeaking = true;
        speakBtn.innerHTML = '<i class="fas fa-stop-circle"></i> <span>Stop Speaking</span>';
        setExpression('talking');
    };
    
    utterance.onend = () => {
        isSpeaking = false;
        speakBtn.innerHTML = '<i class="fas fa-volume-up"></i> <span>Speak Response</span>';
        if (isBored) {
            setExpression('bored');
        } else if (isIdle) {
            setExpression('idle');
        } else {
            setExpression('neutral');
        }
    };
    
    synth.speak(utterance);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initRobot);