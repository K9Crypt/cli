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
            throw new Error(data.error || 'Failed to leave room');
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
    const roomData = store.getRoomData(roomId)
    if (!roomData || !roomData.active) {
        console.error(chalk.red('\nYou must join the room before starting the chat.'))
        return
    }

    const INITIAL_POLL_INTERVAL = 100
    const MAX_POLL_INTERVAL = 500
    const BACKOFF_RATE = 1.1
    const MAX_MESSAGE_CACHE_SIZE = 1000

    function createMessageBox() {
        return blessed.box({
        top: 0,
        left: 0,
        height: '90%',
        width: '100%',
        scrollable: true,
        alwaysScroll: true,
        mouse: false,
        keys: true,
        vi: true,
        tags: true,
        style: { fg: 'white' }
        })
    }

    function createStatusBox() {
        return blessed.box({
        bottom: '10%',
        left: 0,
        height: '10%',
        width: '100%',
        tags: false,
        style: { fg: 'yellow' }
        })
    }

    function createInputBox() {
        return blessed.textbox({
        bottom: 0,
        left: 0,
        height: '10%',
        width: '100%',
        keys: true,
        mouse: false,
        inputOnFocus: true,
        padding: { left: 1 },
        border: { type: 'line', fg: 'white' },
        style: { fg: 'white', bg: 'transparent' }
        })
    }

    const state = {
        lastMessageId: null,
        isPolling: true,
        messageCache: new Map(),
        pollInterval: INITIAL_POLL_INTERVAL
    }

    const screen = blessed.screen({
        smartCSR: true,
        title: 'K9Crypt Chat',
        fullUnicode: true
    })

    const messageBox = createMessageBox()
    const statusBox = createStatusBox()
    const inputBox = createInputBox()

    screen.append(messageBox)
    screen.append(statusBox)
    screen.append(inputBox)

    const updateStatus = (message, type = 'info') => {
        statusBox.setContent(message)
        screen.render()
    }

    const resetPollInterval = () => {
        state.pollInterval = INITIAL_POLL_INTERVAL
    }

    const appendMessage = (message) => {
        if (!message || !message.id || state.messageCache.has(message.id)) return
    
        const date = new Date(message.timestamp).toLocaleTimeString()
        let formattedMessage

        if (message.userId === 'System') {
            formattedMessage = `{yellow-fg}[${date}] System: ${message.decryptedMessage}{/yellow-fg}`
        } else {
            formattedMessage = `{magenta-fg}[${date}] ${message.userId}{/magenta-fg}: ${message.decryptedMessage}`
        }

        messageBox.pushLine(formattedMessage)
        messageBox.setScrollPerc(100)
        screen.render()
        state.messageCache.set(message.id, message)

        if (state.messageCache.size > MAX_MESSAGE_CACHE_SIZE) {
            const firstKey = state.messageCache.keys().next().value
            state.messageCache.delete(firstKey)
        }
    }

    const handleApiError = async (response, defaultMessage) => {
        if (!response.ok) {
        let errorMessage = defaultMessage
        try {
            const errorText = await response.text()
            errorMessage = `Server error: ${response.status} - ${errorText || response.statusText}`
        } catch (e) {
            errorMessage = `Server error: ${response.status} - ${defaultMessage}`
        }
        updateStatus(errorMessage, 'error')
        return true
        }
        return false
    }

    const fetchMessages = async () => {
        try {
        const response = await fetch(`${API_URL}/room/${roomId}/messages?after=${state.lastMessageId || ''}`, {
            method: 'GET',
            headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
            }
        })
        if (await handleApiError(response, 'Failed to fetch messages.')) return
        const data = await response.json()

        if (data.messages && data.messages.length > 0) {
            const messages = await Promise.all(data.messages.map(async (msg) => {
            if (state.messageCache.has(msg.id)) return null
            try {
                const decryptedMessage = await decryptMessage(msg.message)
                return { ...msg, decryptedMessage }
            } catch (error) {
                updateStatus(`Decryption error: ${error.message}`, 'error')
                return null
            }
            }))
            messages.filter(msg => msg !== null).forEach(appendMessage)
            if (data.messages.length > 0) {
            state.lastMessageId = data.messages[data.messages.length - 1].id
            }
            resetPollInterval()
        } else {
            state.pollInterval = Math.min(state.pollInterval * BACKOFF_RATE, MAX_POLL_INTERVAL)
        }
        } catch (error) {
        updateStatus(`Connection error: ${error.message}`, 'error')
        state.pollInterval = Math.min(state.pollInterval * BACKOFF_RATE, MAX_POLL_INTERVAL)
        }
    }

    let pollTimeoutId = null

    const startPolling = async () => {
        if (!state.isPolling) return

        const poll = async () => {
        if (!state.isPolling) return
        try {
            await fetchMessages()
        } catch (error) {
            updateStatus(`Polling error: ${error.message}`, 'error')
        } finally {
            if (state.isPolling) {
            pollTimeoutId = setTimeout(poll, state.pollInterval)
            }
        }
        }
        await poll()
    }

    const sendMessage_ = async (text) => {
        const trimmedText = text.trim()
        if (!trimmedText) return

        if (trimmedText.startsWith('/')) {
            switch (trimmedText) {
                case '/help':
                    const helpMessage = [
                        '',
                        '{green-fg}Available Commands:{/green-fg}',
                        '{cyan-fg}/help{/cyan-fg} - Show this help message',
                        '{cyan-fg}/quit{/cyan-fg} - Leave the room and close chat',
                        '{cyan-fg}/refresh{/cyan-fg} - Refresh the chat',
                        '',
                        '{blue-fg}Info: This message is only visible to you.{/blue-fg}'
                    ].join('\n')
                    messageBox.pushLine(helpMessage)
                    messageBox.setScrollPerc(100)
                    screen.render()
                    inputBox.clearValue()
                    screen.render()
                    inputBox.focus()
                    return

                case '/refresh':
                    try {
                        updateStatus('Refreshing messages...', 'info')
                        state.messageCache.clear()
                        state.lastMessageId = null
                        messageBox.setContent('')
                        screen.render()
                        await fetchMessages()
                        updateStatus('Messages refreshed', 'info')
                    } catch (error) {
                        updateStatus(`Failed to refresh messages: ${error.message}`, 'error')
                    } finally {
                        inputBox.clearValue()
                        screen.render()
                        inputBox.focus()
                    }
                    return

                case '/quit':
                    try {
                        await leaveRoom(roomId, store.getUserData('userId'))
                        state.isPolling = false
                        clearTimeout(pollTimeoutId)
                        screen.destroy()
                        process.exit(0)
                    } catch (error) {
                        updateStatus(`Failed to leave room: ${error.message}`, 'error')
                    }
                    return
            }
        }

        if (trimmedText === '/quit') {
            try {
                await leaveRoom(roomId, store.getUserData('userId'))
                state.isPolling = false
                clearTimeout(pollTimeoutId)
                screen.destroy()
                process.exit(0)
            } catch (error) {
                updateStatus(`Failed to leave room: ${error.message}`, 'error')
            }
            return
        }

        try {
            updateStatus('Sending message...', 'info')
            const response = await fetch(`${API_URL}/room/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId,
                    userId: store.getUserData('userId'),
                    message: trimmedText
                })
            })
            if (await handleApiError(response, 'Failed to send message.')) return
            updateStatus('Message sent', 'info')
            resetPollInterval()
        } catch (error) {
            updateStatus(`Failed to send message: ${error.message}`, 'error')
        } finally {
            inputBox.clearValue()
            screen.render()
            inputBox.focus()
        }
    }
    inputBox.key('enter', () => {
        sendMessage_(inputBox.getValue())
    })

    screen.key(['escape', 'q', 'C-c'], () => {
        state.isPolling = false
        clearTimeout(pollTimeoutId)
        screen.destroy()
        process.exit(0)
    })

    screen.render()
    inputBox.focus()
    startPolling()
}