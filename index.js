import { program } from 'commander';
import chalk from 'chalk';
import { Store } from './src/store.js';
import {
    ROOM_LIFETIMES,
    createRoom,
    joinRoom,
    leaveRoom,
    listRooms,
    sendMessage,
    startChat
} from './src/services.js';

const store = new Store({
    name: 'k9crypt'
});

program
    .version('0.1.2')
    .description('A CLI tool for K9Crypt, offering encrypted real-time chat rooms, message encryption/decryption, and room management.');

program
    .command('create <roomName> <type> [password]')
    .description('Create a new room')
    .option('-l, --lifetime <lifetime>', 'Room lifetime (day/month/year/permanent)', 'day')
    .action(async (roomName, type, password, options) => {
        let lifetime = ROOM_LIFETIMES.ONE_DAY;

        switch (options.lifetime) {
            case 'month': lifetime = ROOM_LIFETIMES.ONE_MONTH; break;
            case 'year': lifetime = ROOM_LIFETIMES.ONE_YEAR; break;
            case 'permanent': lifetime = ROOM_LIFETIMES.PERMANENT; break;
        }

        try {
            await createRoom(
                store.getUserData('userId'),
                type === 'public' ? 'public' : 'private',
                password,
                roomName,
                lifetime
            );
        } catch (error) {
            console.error(chalk.red('Failed to create room:', error.message));
            process.exit(1);
        }
    });

program
    .command('join [roomId] [password]')
    .description('Join an existing room')
    .action(async (roomId, password) => {
        let id = roomId;
        if (!id) {
            const rooms = store.getRoomData();
            const activeRoom = Object.entries(rooms).find(([_, data]) => data.active);
            id = activeRoom ? activeRoom[0] : null;
        }
        
        if (!id) {
            console.log(chalk.red('Please provide a room ID or create a room first.'));
            process.exit(1);
        }
        try {
            await joinRoom(id, store.getUserData('userId'), password);
        } catch (error) {
            process.exit(1);
        }
    });

program
    .command('leave [roomId]')
    .description('Leave a room')
    .action(async (roomId) => {
        let id = roomId;
        if (!id) {
            const rooms = store.getRoomData();
            const activeRoom = Object.entries(rooms).find(([_, data]) => data.active);
            id = activeRoom ? activeRoom[0] : null;
        }

        if (!id) {
            console.log(chalk.red('Please provide a room ID or join a room first.'));
            process.exit(1);
        }
        try {
            await leaveRoom(id, store.getUserData('userId'));
        } catch (error) {
            process.exit(1);
        }
    });

program
    .command('list')
    .description('List available rooms')
    .action(async () => {
        try {
            await listRooms();
        } catch (error) {
            process.exit(1);
        }
    });

program
    .command('send <message> [roomId]')
    .description('Send a message to a room')
    .action(async (message, roomId) => {
        let id = roomId;
        if (!id) {
            const rooms = store.getRoomData();
            const activeRoom = Object.entries(rooms).find(([_, data]) => data.active);
            id = activeRoom ? activeRoom[0] : null;
        }

        if (!id) {
            console.log(chalk.red('Please provide a room ID or join a room first.'));
            process.exit(1);
        }
        try {
            await sendMessage(id, store.getUserData('userId'), message);
        } catch (error) {
            process.exit(1);
        }
    });

program
    .command('chat [roomId]')
    .description('Start interactive chat in a room')
    .action(async (roomId) => {
        let id = roomId;
        if (!id) {
            const rooms = store.getRoomData();
            const activeRoom = Object.entries(rooms).find(([_, data]) => data.active);
            id = activeRoom ? activeRoom[0] : null;
        }

        if (!id) {
            console.log(chalk.red('Please provide a room ID or join a room first.'));
            process.exit(1);
        }

        try {
            await startChat(id);
        } catch (error) {
            console.error(chalk.red('Error starting chat:', error.message));
            process.exit(1);
        }
    });

program.parse(process.argv);