import fetch from 'node-fetch';
import chalk from 'chalk';
import ora from 'ora';
import blessed from 'blessed';
import { Store } from './store.js';

const API_URL = "https://api.k9crypt.xyz";

const store = new Store({
    name: 'k9crypt'
});

export const ROOM_LIFETIMES = {
    ONE_DAY: 24 * 60 * 60 * 1000,
    ONE_MONTH: 30 * 24 * 60 * 60 * 1000,
    ONE_YEAR: 365 * 24 * 60 * 60 * 1000,
    PERMANENT: -1
};

export async function createRoom(userId, type, password, roomName, lifetime = ROOM_LIFETIMES.ONE_DAY) {
    const spinner = ora('Creating room...').start();

    try {
        const response = await fetch(`${API_URL}/room/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, type, password, roomName, lifetime }),
        });

        if (!response.ok) {
            throw new Error('Failed to create room');
        }

        const data = await response.json();
        spinner.succeed('Room created successfully!');
        console.log(chalk.green('\nRoom Information:'));
        console.log(chalk.cyan('Room ID:'), data.roomId);
        console.log(chalk.cyan('Expires At:'), data.expiresAt || 'Permanent');

        store.setRoomData(data.roomId, {
            id: data.roomId,
            expiresAt: data.expiresAt || null
        });

        return {
            roomId: data.roomId || '',
            expiresAt: data.expiresAt || null
        };
    } catch (error) {
        spinner.fail('An error occurred!');
        console.error(chalk.red('\nError:'), error.message);
        throw error;
    }
}

export async function decryptMessage(encryptedMessage) {
    try {
        const response = await fetch(`${API_URL}/view`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: encryptedMessage }),
        });

        if (!response.ok) {
            throw new Error('Failed to decrypt message');
        }

        const data = await response.text();
        return data;
    } catch (error) {
        spinner.fail('Failed to decrypt message!'); // spinner is not defined
        console.error(chalk.red('\nError:'), error.message);
        throw error;
    }
}

export async function joinRoom(roomId, userId, password) {
    const spinner = ora('Joining room...').start();

    try {
        const response = await fetch(`${API_URL}/room/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ roomId, userId, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to join room');
        }

        spinner.succeed('Joined room successfully!');
        store.setRoomData(roomId, { active: true });
        return data.message;
    } catch (error) {
        spinner.fail('An error occurred while joining the room!');
        console.error(chalk.red('\nError:'), error.message);
        throw error;
    }
}

export async function leaveRoom(roomId, userId) {
    const spinner = ora('Leaving room...').start();

    try {
        const response = await fetch(`${API_URL}/room/leave`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ roomId, userId }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to leave room'); // what if data.error is undefined?
        }

        spinner.succeed('Left room successfully!');
        const roomData = store.getRoomData(roomId);
        if (roomData && roomData.active) {
            store.setRoomData(roomId, { ...roomData, active: false });
        }
        return data.message;
    } catch (error) {
        spinner.fail('An error occurred while leaving the room!');
        console.error(chalk.red('\nError:'), error.message);
        throw error;
    }
}

export async function listRooms() {
    const spinner = ora('Listing rooms...').start();

    try {
        const response = await fetch(`${API_URL}/room/list`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('An error occurred while listing rooms');
        }

        const data = await response.json();
        spinner.succeed('Rooms listed successfully!');

        const rooms = data.rooms || [];
        if (rooms.length === 0) {
            console.log(chalk.yellow('\nNo rooms have been created yet.'));
        } else {
            console.log(chalk.green('\nAvailable Rooms:'));
            rooms.forEach(room => {
                console.log(chalk.cyan('\nRoom ID:'), room.id);
                console.log(chalk.cyan('Room Name:'), room.roomName);
                console.log(chalk.cyan('Type:'), room.type === 'public' ? 'Public' : 'Private');
                console.log(chalk.cyan('User Count:'), room.userCount || 0);
                console.log(chalk.cyan('Expires At:'), room.expiresAt || 'Permanent');
            });
        }

        return rooms;
    } catch (error) {
        spinner.fail('An error occurred while listing rooms!');
        console.error(chalk.red('\nError:'), error.message);
        throw error;
    }
}

export async function sendMessage(roomId, userId, message) {
    const spinner = ora('Encrypting message...').start();

    try {
        spinner.text = 'Sending message...';

        const response = await fetch(`${API_URL}/room/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ roomId, userId, message: message }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to send message');
        }

        spinner.succeed('Message sent successfully!');
        return data.message;
    } catch (error) {
        spinner.fail('An error occurred while sending the message!');
        console.error(chalk.red('\nError:'), error.message);
        throw error;
    }
}

export async function startChat(roomId) {
    const roomData = store.getRoomData(roomId);
    if (!roomData || !roomData.active) {
        console.error(chalk.red('\nYou must join the room before starting the chat.'));
        return;
    }

    const INITIAL_POLL_INTERVAL = 1000;
    const MAX_POLL_INTERVAL = 5000;
    const BACKOFF_RATE = 1.5;
    const DEBOUNCE_TIME = 200;
    const MAX_MESSAGE_CACHE_SIZE = 1000;
    // const MESSAGE_BATCH_SIZE = 10; // Not used anymore, we use Promise.all

    function createMessageBox() {
        return blessed.box({
            top: 0,
            left: 0,
            height: '90%',
            width: '100%',
            tags: true,
            scrollable: true,
            alwaysScroll: true,
            mouse: true,
            keys: true,
            vi: true,
            scrollbar: {
                ch: ' ',
                track: { bg: 'cyan' },
                style: { inverse: true },
            },
            border: { type: 'line' },
            style: {
                fg: 'white',
                border: { fg: '#f0f0f0' },
            },
        });
    }

    function createStatusBox() {
        return blessed.box({
            bottom: '10%',
            left: 0,
            height: '10%',
            width: '100%',
            tags: true,
            border: { type: 'line' },
            style: {
                fg: 'yellow',
                border: { fg: '#f0f0f0' },
            },
        });
    }

    function createInputBox() {
        return blessed.textbox({
            bottom: 0,
            left: 0,
            height: '10%',
            width: '100%',
            keys: true,
            mouse: true,
            inputOnFocus: true,
            padding: { top: 1, left: 2 },
            border: { type: 'line' },
            style: {
                fg: 'white',
                border: { fg: '#f0f0f0' },
                focus: { border: { fg: 'green' } },
            },
        });
    }

    const state = {
        lastMessageId: null,
        isPolling: true,
        messageCache: new Map(),
        pollInterval: INITIAL_POLL_INTERVAL,
        typingTimeout: null,  // Used for debouncing send message
    };

    const screen = blessed.screen({
        smartCSR: true,
        title: 'K9Crypt Chat',
        fullUnicode: true,
    });

    const messageBox = createMessageBox();
    const statusBox = createStatusBox();
    const inputBox = createInputBox();

    screen.append(messageBox);
    screen.append(statusBox);
    screen.append(inputBox);

    const updateStatus = (message, type = 'info') => {
        const statusContent = {
            info: `{yellow-fg}${message}{/yellow-fg}`,
            error: `{red-fg}${message}{/red-fg}`,
            success: `{green-fg}${message}{/green-fg}`,
        }[type] || message;

        statusBox.setContent(statusContent);
        screen.render();
    };

    const resetPollInterval = () => {
        state.pollInterval = INITIAL_POLL_INTERVAL;
    };

    const appendMessage = (message) => {
        if (!message || !message.id || state.messageCache.has(message.id)) return;

        const date = new Date(message.timestamp).toLocaleTimeString();
        const formattedMessage = `{cyan-fg}[${date}] ${message.userId}:{/cyan-fg} ${message.decryptedMessage}`;

        messageBox.pushLine(formattedMessage);
        messageBox.setScrollPerc(100); // Scroll to the bottom
        screen.render();

        state.messageCache.set(message.id, message);

        // Limit the size of the message cache
        if (state.messageCache.size > MAX_MESSAGE_CACHE_SIZE) {
            const firstKey = state.messageCache.keys().next().value;
            state.messageCache.delete(firstKey);
        }
    };

    const handleApiError = async (response, defaultMessage) => {
        if (!response.ok) {
            let errorMessage = defaultMessage;
            try {
                const errorText = await response.text();
                errorMessage = `Server error: ${response.status} - ${errorText || response.statusText}`;
            } catch (e) {
                errorMessage = `Server error: ${response.status} - ${defaultMessage}`;
            }
            updateStatus(errorMessage, 'error');
            return true;
        }
        return false;
    };

    const fetchMessages = async () => {
        try {
            const response = await fetch(
                `${API_URL}/room/${roomId}/messages?after=${state.lastMessageId || ''}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache',
                    },
                }
            );

            if (await handleApiError(response, 'Failed to fetch messages.')) return;

            const data = await response.json();

            if (data.messages?.length > 0) {
                // Decrypt messages concurrently using Promise.all
                const decryptedMessages = await Promise.all(
                    data.messages.map(async (msg) => {
                        if (state.messageCache.has(msg.id)) {
                            return null;
                        }
                        try {
                            const decryptedMessage = await decryptMessage(msg.message);
                            return { ...msg, decryptedMessage };
                        } catch (decryptionError) {
                            updateStatus(`Decryption error: ${decryptionError.message}`, 'error');
                            return null;
                        }
                    })
                );

                // Filter out null values (failed decryptions or cached messages) and append
                decryptedMessages.filter(msg => msg !== null).forEach(appendMessage);

                // Update lastMessageId only if we have new messages
                if (decryptedMessages.length > 0) {
                    // Use the ID from the original message data, not the decrypted one
                    state.lastMessageId = data.messages[data.messages.length - 1].id;
                }
                resetPollInterval();
            } else {
                // Increase poll interval using exponential backoff
                state.pollInterval = Math.min(
                    state.pollInterval * BACKOFF_RATE,
                    MAX_POLL_INTERVAL
                );
            }
        } catch (error) {
            updateStatus(`Connection error: ${error.message}`, 'error');
            // Backoff even on connection errors
            state.pollInterval = Math.min(
                state.pollInterval * BACKOFF_RATE,
                MAX_POLL_INTERVAL
            );
        }
    };

    let pollTimeoutId = null; // Store the timeout ID

    const startPolling = async () => {
        if (!state.isPolling) return;
        
        const poll = async () => {
            if (!state.isPolling) return;  // Additional check
            try {
                await fetchMessages();
            } catch (error) {
                updateStatus(`Polling error: ${error.message}`, 'error');
            } finally {
                if (state.isPolling) {
                    pollTimeoutId = setTimeout(poll, state.pollInterval);
                }
            }
        };
        await poll();
    };

    const sendMessage = async (text) => {
        const trimmedText = text.trim();
        if (!trimmedText) return;

        try {
            updateStatus('Sending message...', 'info');
            const response = await fetch(`${API_URL}/room/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId,
                    userId: store.getUserData('userId'),
                    message: trimmedText,
                }),
            });

            if (await handleApiError(response, 'Failed to send message.')) return;

            updateStatus('Message sent', 'success');
            resetPollInterval();
        } catch (error) {
            updateStatus(`Failed to send message: ${error.message}`, 'error');
        } finally {
            // Always clear the input box and refocus, even on error
            inputBox.clearValue();
            screen.render();
            inputBox.focus();
        }
    };

    let typingTimeout = null;
    const debouncedSendMessage = (text) => {
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            sendMessage(text);
        }, DEBOUNCE_TIME);
    };


    inputBox.key('enter', () => {
        debouncedSendMessage(inputBox.getValue());
    });

    screen.key(['escape', 'q', 'C-c'], () => {
        state.isPolling = false;
        clearTimeout(pollTimeoutId);
        clearTimeout(typingTimeout);
        clearTimeout(state.typingTimeout);
        screen.destroy();
        process.exit(0);
    });

    screen.render();
    inputBox.focus();
    startPolling();
}