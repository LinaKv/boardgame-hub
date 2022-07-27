"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initNameSpace = void 0;
const types_1 = require("./types");
const dbActions_1 = require("./dbActions");
const utils_1 = require("../utils/utils");
class Connection {
    socket;
    ns;
    roomCode;
    constructor(ns, socket) {
        this.socket = socket;
        this.ns = ns;
        this.roomCode = '';
        socket.on('disconnect', () => this.disconnect());
        socket.on('disconnecting', () => this.disconnecting());
        socket.on('start game', async () => await this.startGame());
        socket.on('nominate player', async (playerId) => await this.nominatePlayer(playerId));
        socket.on('global vote', async (vote) => await this.vote(vote, true));
        socket.on('quest vote', async (vote) => await this.vote(vote));
        socket.on('confirm party', async () => await this.confirmParty());
        socket.on('start new vote', async () => await this.startNewVote());
        socket.on('assassinate', async (targetId) => await this.assassinate(targetId));
        socket.on('toggle extra role', async (roleKey) => await this.toggleExtraRole(roleKey));
        socket.on('get existing player', async (params) => await this.getExistingPlayer(params));
        socket.on('change player name', async (newName) => await this.changePlayerName(newName));
        socket.on('init room', async (params) => await this.initRoom(params));
        socket.on('join room', async ({ roomCode, nickname }) => await this.addPlayerToRoom({ roomCode, nickname }));
    }
    async initRoom(params) {
        try {
            const { roomCode, nickname } = params;
            const [_, created] = await (0, dbActions_1.createRoom)(roomCode, this.socket.id);
            this.socket.join(roomCode);
            this.roomCode = roomCode;
            await this.addPlayerToRoom({ nickname, isHost: created, roomCode });
        }
        catch (error) {
            console.log(error);
        }
    }
    async addPlayerToRoom({ nickname, roomCode, isHost = false, }) {
        this.roomCode = roomCode;
        this.socket.join(roomCode);
        const playerCount = await (0, dbActions_1.countPlayers)(roomCode);
        const room = await (0, dbActions_1.getRoom)(roomCode);
        if (room) {
            const avatars = Object.values(room.takenImages);
            const availableAvatars = avatars.filter((avatar) => !avatar.taken);
            const suggestedAvatar = !!availableAvatars.length
                ? (0, utils_1.shuffle)(availableAvatars)[0]
                : avatars[Math.floor(Math.random() * avatars.length)];
            room.takenImages[suggestedAvatar.key].taken = true;
            await room.save();
            const newPlayer = await (0, dbActions_1.createPlayer)({
                roomCode,
                socketId: this.socket.id,
                name: nickname,
                isHost,
                roleName: '',
                roleKey: null,
                order: playerCount + 1,
                questVote: null,
                globalVote: null,
                connected: true,
                imageName: suggestedAvatar.key,
            });
            this.ns.to(this.socket.id).emit('register', newPlayer.playerUUID);
            const players = await (0, dbActions_1.getPlayerList)(roomCode);
            this.ns.to(roomCode).emit('players', players);
        }
    }
    async getExistingPlayer(params) {
        const { playerUUID, roomCode, nickname } = params;
        const room = await (0, dbActions_1.getRoom)(roomCode);
        if (!!room) {
            const playerExist = await (0, dbActions_1.findPlayer)(roomCode, { playerUUID });
            if (playerExist) {
                this.roomCode = roomCode;
                this.socket.join(roomCode);
                playerExist.connected = true;
                playerExist.socketId = this.socket.id;
                if (playerExist.isCurrentLeader) {
                    room.currentLeaderId = this.socket.id;
                    await room.save();
                }
                await playerExist.save();
                const roomInfo = await (0, dbActions_1.getRoomWithPlayers)(roomCode);
                this.ns.to(roomCode).emit('update room', roomInfo);
                this.ns.to(this.socket.id).emit('assigned role', {
                    roleName: playerExist.roleName,
                    roleKey: playerExist.roleKey,
                    side: playerExist.side,
                    secretInfo: playerExist.secretInformation,
                    description: playerExist.roleDescription,
                });
            }
            else {
                await this.addPlayerToRoom({ nickname, roomCode });
            }
        }
        else {
            await this.initRoom({ roomCode, nickname });
        }
    }
    async disconnect() {
        await (0, dbActions_1.deleteRoomIfNoPlayers)(this.roomCode);
    }
    async disconnecting() {
        const { id } = this.socket;
        await (0, dbActions_1.updatePlayer)({ socketId: id, updatedProperties: { connected: false } });
        const roomInfo = await (0, dbActions_1.getRoomWithPlayers)(this.roomCode);
        this.ns.to(this.roomCode).emit('update room', roomInfo);
    }
    async initAndSendQuests(playerCount) {
        await (0, dbActions_1.initQuests)(this.roomCode, playerCount);
        const quests = await (0, dbActions_1.getQuests)(this.roomCode);
        this.ns.to(this.roomCode).emit('quests', quests.sort((a, b) => a.questNumber - b.questNumber));
    }
    async startGame() {
        await (0, dbActions_1.startNewVoteCycle)(this.roomCode);
        await (0, dbActions_1.assignRoles)(this.roomCode);
        const players = await (0, dbActions_1.getPlayerList)(this.roomCode);
        const roomInfo = await (0, dbActions_1.getRoomWithPlayers)(this.roomCode);
        if (roomInfo) {
            roomInfo.gameInProgress = true;
            roomInfo.nominationInProgress = true;
            roomInfo.globalVoteInProgress = false;
            roomInfo.questVoteInProgress = false;
            roomInfo.assassinationInProgress = false;
            roomInfo.revealVotes = false;
            roomInfo.revealRoles = false;
            roomInfo.missedTeamVotes = 0;
            roomInfo.currentLeaderId = players.find((player) => player.isCurrentLeader)?.socketId || '';
            roomInfo.gameMessage = `Leader must nominate players for the quest.`;
            await roomInfo.save();
            // TODO check that at least 5 players joined
            this.ns.to(this.roomCode).emit('update room', roomInfo);
            players.forEach((player) => {
                this.ns.to(player.socketId).emit('assigned role', {
                    roleName: player.roleName,
                    roleKey: player.roleKey,
                    side: player.side,
                    secretInfo: player.secretInformation,
                    description: player.roleDescription,
                });
            });
            this.initAndSendQuests(players.length);
        }
    }
    async nominatePlayer(playerId) {
        await (0, dbActions_1.nominatePlayer)(this.roomCode, playerId);
        const playerList = await (0, dbActions_1.getPlayerList)(this.roomCode);
        this.ns.to(this.roomCode).emit('players', playerList);
    }
    // TODO Optimize this and maybe split global and quest votes
    async vote(vote, isGlobal = false) {
        const voterId = this.socket.id;
        this.ns.to(this.roomCode).emit('player voted', voterId);
        if (isGlobal) {
            await (0, dbActions_1.updatePlayer)({ socketId: voterId, updatedProperties: { globalVote: vote } });
            await (0, dbActions_1.handleGlobalVote)(this.roomCode);
        }
        else {
            await (0, dbActions_1.updatePlayer)({ socketId: voterId, updatedProperties: { questVote: vote } });
            await (0, dbActions_1.handleQuestVote)(this.roomCode);
        }
        const roomInfo = await (0, dbActions_1.getRoomWithPlayers)(this.roomCode);
        this.ns.to(this.roomCode).emit('update room', roomInfo);
    }
    async confirmParty() {
        const activeQuest = await (0, dbActions_1.getActiveQuest)(this.roomCode);
        const nominatedPlayerCount = await (0, dbActions_1.countPlayers)(this.roomCode, { nominated: true });
        if (nominatedPlayerCount === activeQuest?.questPartySize) {
            const roomInfo = await (0, dbActions_1.getRoomWithPlayers)(this.roomCode);
            if (roomInfo) {
                roomInfo.nominationInProgress = false;
                roomInfo.globalVoteInProgress = true;
                roomInfo.revealVotes = false;
                roomInfo.gameMessage = 'Everyone should vote for the selected party';
                await roomInfo.save();
            }
            await (0, dbActions_1.clearVotes)(this.roomCode);
            this.ns.to(this.roomCode).emit('update room', roomInfo);
        }
        else {
            this.ns.to(this.roomCode).emit('not enough players');
        }
    }
    async assassinate(targetId) {
        const assassin = await (0, dbActions_1.findPlayer)(this.roomCode, { roleKey: types_1.ROLE_LIST.ASSASSIN });
        const target = await (0, dbActions_1.findPlayer)(this.roomCode, { socketId: targetId });
        const room = await (0, dbActions_1.getRoom)(this.roomCode);
        if (room) {
            if (assassin?.socketId === this.socket.id) {
                this.ns.to(this.roomCode).emit('player killed', targetId);
                const merlinKilled = target?.roleKey === types_1.ROLE_LIST.MERLIN;
                room.gameMessage = merlinKilled
                    ? 'Merlin was killed! Evil are now victorious'
                    : 'Assassin has missed! The victory stays on the Good side';
                room.revealRoles = true;
            }
            room.gameInProgress = false;
            room.revealVotes = false;
            await room.save();
            this.ns.to(this.roomCode).emit('update room', room);
        }
    }
    async toggleExtraRole(roleKey) {
        const room = await (0, dbActions_1.getRoom)(this.roomCode);
        if (room && room.extraRoles) {
            room.extraRoles = room.extraRoles.includes(roleKey)
                ? room.extraRoles.filter((role) => role !== roleKey)
                : [...room.extraRoles, roleKey];
            await room.save();
            this.ns.to(this.roomCode).emit('update room', room);
        }
    }
    async startNewVote() {
        await (0, dbActions_1.startNewVoteCycle)(this.roomCode);
    }
    async changePlayerName(newName) {
        const player = await (0, dbActions_1.findPlayer)(this.roomCode, { socketId: this.socket.id });
        console.log('here', newName);
        if (player) {
            console.log('here2');
            player.name = newName;
            await player.save();
            this.ns.to(this.roomCode).emit('update room', await (0, dbActions_1.getRoomWithPlayers)(this.roomCode));
        }
    }
}
const initNameSpace = (io) => {
    const avalonNameSpace = io.of('/avalon');
    avalonNameSpace.on('connection', (socket) => {
        new Connection(avalonNameSpace, socket);
    });
};
exports.initNameSpace = initNameSpace;
