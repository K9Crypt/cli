import os from 'os';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';

export class Store {
    constructor(options = {}) {
        const defaultDir = path.join(os.homedir(), '.k9crypt');
        
        this.config = {
            name: options.name || 'k9crypt',
            fileExtension: '.json',
            dataDir: options.dataDir || defaultDir
        };

        this.initializeDataDir();

        this.paths = {
            userData: path.join(this.config.dataDir, `user${this.config.fileExtension}`),
            roomData: path.join(this.config.dataDir, `rooms${this.config.fileExtension}`),
            settings: path.join(this.config.dataDir, `settings${this.config.fileExtension}`)
        };

        this.data = {
            user: this.loadFile(this.paths.userData),
            rooms: this.loadFile(this.paths.roomData),
            settings: this.loadFile(this.paths.settings)
        };

        this.initializeUser();
    }

    initializeDataDir() {
        if (!fs.existsSync(this.config.dataDir)) {
            fs.mkdirSync(this.config.dataDir, { recursive: true });
        }
    }

    loadFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
        } catch (error) {
            console.error(chalk.red(`Error loading file ${filePath}:`, error.message));
        }
        return {};
    }

    saveFile(filePath, data) {
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error(chalk.red(`Error saving file ${filePath}:`, error.message));
            return false;
        }
    }

    initializeUser() {
        if (!this.data.user.userId) {
            this.data.user.userId = Math.random().toString(36).substring(7);
            this.saveFile(this.paths.userData, this.data.user);
        }
    }

    getUserData(key) {
        return key ? this.data.user[key] : this.data.user;
    }

    setUserData(key, value) {
        this.data.user[key] = value;
        return this.saveFile(this.paths.userData, this.data.user);
    }

    getRoomData(roomId) {
        return roomId ? this.data.rooms[roomId] : this.data.rooms;
    }

    setRoomData(roomId, data) {
        this.data.rooms[roomId] = data;
        return this.saveFile(this.paths.roomData, this.data.rooms);
    }

    getSetting(key) {
        return key ? this.data.settings[key] : this.data.settings;
    }

    setSetting(key, value) {
        this.data.settings[key] = value;
        return this.saveFile(this.paths.settings, this.data.settings);
    }

    // Clear methods
    clearRoomData() {
        this.data.rooms = {};
        return this.saveFile(this.paths.roomData, this.data.rooms);
    }

    clearUserData() {
        const userId = this.data.user.userId;
        this.data.user = { userId };
        return this.saveFile(this.paths.userData, this.data.user);
    }

    clearSettings() {
        this.data.settings = {};
        return this.saveFile(this.paths.settings, this.data.settings);
    }

    clearAll() {
        return Promise.all([
            this.clearRoomData(),
            this.clearUserData(),
            this.clearSettings()
        ]);
    }
}