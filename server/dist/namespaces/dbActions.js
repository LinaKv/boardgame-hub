"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreDefaults = exports.checkForEndGame = exports.handleQuestVote = exports.startNewVoteCycle = exports.clearVotes = exports.handleGlobalVote = exports.switchToNextLeader = exports.assignRoles = exports.updateQuestResult = exports.changeActiveQuest = exports.initQuests = exports.getActiveQuest = exports.getQuests = exports.updateRoom = exports.getRoom = exports.createRoom = exports.getRoomWithPlayers = exports.removeRoomAndPlayers = exports.nominatePlayer = exports.countPlayers = exports.getPlayerBySocketId = exports.findAndDeletePlayer = exports.updateAllPlayers = exports.updatePlayer = exports.createPlayer = exports.findPlayer = exports.getPlayerList = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../config/db");
const engine_1 = require("./engine");
const getPlayerList = async (roomCode) => {
    const players = await db_1.AvalonPlayer.findAll({
        where: {
            roomCode,
        },
        order: [['order', 'ASC']],
    });
    return players;
};
exports.getPlayerList = getPlayerList;
const findPlayer = async (roomCode, where) => {
    const player = await db_1.AvalonPlayer.findOne({
        where: {
            roomCode,
            ...where,
        },
    });
    return player;
};
exports.findPlayer = findPlayer;
const createPlayer = async (player) => {
    await db_1.AvalonPlayer.create(player);
};
exports.createPlayer = createPlayer;
const updatePlayer = async ({ socketId, updatedProperties, }) => {
    await db_1.AvalonPlayer.update(updatedProperties, {
        where: {
            socketId: socketId,
        },
    });
};
exports.updatePlayer = updatePlayer;
const updateAllPlayers = async (roomCode, updatedProperties) => {
    await db_1.AvalonPlayer.update(updatedProperties, {
        where: {
            roomCode,
        },
    });
};
exports.updateAllPlayers = updateAllPlayers;
// TODO make appropriate changes if at some point the same socket will be used for multiple rooms
const findAndDeletePlayer = async (socketId) => {
    try {
        const player = await db_1.AvalonPlayer.findOne({
            where: {
                socketId,
            },
        });
        if (player) {
            await db_1.AvalonPlayer.destroy({
                where: {
                    socketId,
                },
            });
        }
    }
    catch (e) {
        console.log(e);
    }
};
exports.findAndDeletePlayer = findAndDeletePlayer;
// export const getPlayerRole = async (roomCode: string, socketId: string) => {
//     const player = await AvalonPlayer.findOne({
//         where: {
//             roomCode,
//             socketId,
//         },
//     });
//     return player?.role;
// };
const getPlayerBySocketId = async (roomCode, socketId) => {
    const player = await db_1.AvalonPlayer.findOne({
        where: {
            roomCode,
            socketId,
        },
    });
    return player;
};
exports.getPlayerBySocketId = getPlayerBySocketId;
const countPlayers = async (roomCode, condition) => {
    const playerCount = await db_1.AvalonPlayer.count({
        where: {
            roomCode,
            ...condition,
        },
    });
    return playerCount;
};
exports.countPlayers = countPlayers;
const nominatePlayer = async (roomCode, playerId) => {
    const players = await (0, exports.getPlayerList)(roomCode);
    const { selectedPlayer, nominatedCount } = players.reduce((acc, currPlayer) => {
        if (currPlayer.socketId === playerId) {
            acc.selectedPlayer = currPlayer;
        }
        if (currPlayer.nominated) {
            acc.nominatedCount++;
        }
        return acc;
    }, {
        selectedPlayer: null,
        nominatedCount: 0,
    });
    if (selectedPlayer) {
        const quest = await (0, exports.getActiveQuest)(roomCode);
        if (selectedPlayer.nominated) {
            selectedPlayer.nominated = false;
        }
        if (!selectedPlayer.nominated && quest?.questPartySize > nominatedCount) {
            selectedPlayer.nominated = true;
        }
        await selectedPlayer.save();
    }
};
exports.nominatePlayer = nominatePlayer;
// ROOM
const removeRoomAndPlayers = async (roomCode) => {
    const room = await db_1.AvalonRoom.findOne({
        where: {
            roomCode,
        },
    });
    if (room) {
        await Promise.all([
            db_1.AvalonRoom.destroy({
                where: {
                    roomCode,
                },
            }),
            db_1.AvalonPlayer.destroy({
                where: {
                    roomCode,
                },
            }),
        ]);
    }
};
exports.removeRoomAndPlayers = removeRoomAndPlayers;
const getRoomWithPlayers = async (roomCode) => {
    const room = await db_1.AvalonRoom.findOne({
        where: {
            roomCode,
        },
        include: [
            {
                model: db_1.AvalonPlayer,
                order: [['order', 'ASC']],
                attributes: { exclude: ['role', 'side', 'secretInformation'] },
            },
            { model: db_1.AvalonQuest, order: [['questNumber', 'ASC']] },
        ],
    });
    return room;
};
exports.getRoomWithPlayers = getRoomWithPlayers;
const createRoom = async (roomCode, socketId) => {
    return await db_1.AvalonRoom.findOrCreate({
        where: {
            roomCode,
        },
        defaults: {
            roomCode,
            hostSocketId: socketId,
        },
    });
};
exports.createRoom = createRoom;
const getRoom = async (roomCode) => {
    const room = await db_1.AvalonRoom.findOne({
        where: {
            roomCode,
        },
    });
    return room;
};
exports.getRoom = getRoom;
const updateRoom = async (roomCode, newData) => {
    await db_1.AvalonRoom.update(newData, {
        where: {
            roomCode,
        },
    });
};
exports.updateRoom = updateRoom;
// get all quests for a room
const getQuests = async (roomCode) => {
    const quests = await db_1.AvalonQuest.findAll({
        where: {
            roomCode,
        },
        order: [['questNumber', 'ASC']],
    });
    return quests;
};
exports.getQuests = getQuests;
const getActiveQuest = async (roomCode) => {
    const quests = await db_1.AvalonQuest.findOne({
        where: {
            roomCode,
            active: true,
        },
    });
    return quests;
};
exports.getActiveQuest = getActiveQuest;
const initQuests = async (roomCode, numberOfPlayers) => {
    const { questPartySize } = engine_1.DISTRIBUTION[numberOfPlayers];
    const quests = await db_1.AvalonQuest.findAll({
        where: {
            roomCode,
        },
    });
    if (quests.length) {
        await db_1.AvalonQuest.destroy({
            where: {
                roomCode,
            },
        });
    }
    await db_1.AvalonQuest.bulkCreate(questPartySize.map((partySize, i) => {
        return { roomCode, questNumber: i + 1, questPartySize: partySize, questResult: null, active: i === 0 };
    }));
};
exports.initQuests = initQuests;
const changeActiveQuest = async (roomCode, questNumber) => {
    if (questNumber > 5) {
        return;
    }
    const currentActiveQuest = await db_1.AvalonQuest.findOne({
        where: {
            roomCode,
            active: true,
        },
    });
    if (currentActiveQuest && currentActiveQuest.questNumber !== questNumber) {
        currentActiveQuest.active = false;
        await currentActiveQuest.save();
    }
    await db_1.AvalonQuest.update({ active: true }, {
        where: {
            roomCode,
            questNumber,
        },
    });
};
exports.changeActiveQuest = changeActiveQuest;
const updateQuestResult = async (roomCode, questNumber, questResult) => {
    await db_1.AvalonQuest.update({ questResult }, {
        where: {
            roomCode,
            questNumber,
        },
    });
};
exports.updateQuestResult = updateQuestResult;
// export const updateQuest = async ({ roomCode, questNumber, questResult, active }: Quest) => {
//     const currentActiveQuest = await AvalonQuest.findOne({
//         where: {
//             roomCode,
//             active: true,
//         },
//     });
//     if (currentActiveQuest && currentActiveQuest.questNumber !== questNumber && active) {
//         currentActiveQuest.active = false;
//         await currentActiveQuest.save();
//     }
//     await AvalonQuest.update(
//         { active, questResult: questResult || '' },
//         {
//             where: {
//                 roomCode,
//                 questNumber,
//             },
//         },
//     );
// };
// UTILS
// also assigns the first leader
const assignRoles = async (roomCode) => {
    const players = await (0, exports.getPlayerList)(roomCode);
    const playerCount = players.length;
    const firstLeaderOrderNumber = Math.floor(Math.random() * playerCount);
    const rolesForPlayers = (0, engine_1.createRoleDistributionArray)(playerCount);
    players.forEach((player, i) => {
        player.role = rolesForPlayers[i].roleName;
        player.side = rolesForPlayers[i].side;
        player.isCurrentLeader = i === firstLeaderOrderNumber;
        player.order = i;
    });
    const addSecretInformation = players.map((player, i, arr) => {
        console.log('secret information', i, arr.length);
        player.secretInformation = (0, engine_1.createMessageByRole)(player, arr);
        return player.save();
    });
    await Promise.all(addSecretInformation);
};
exports.assignRoles = assignRoles;
const switchToNextLeader = async (roomCode) => {
    const players = await (0, exports.getPlayerList)(roomCode);
    // await updateAllPlayers(roomCode, { nominated: false });
    const currentLeader = players.find((player) => player.isCurrentLeader);
    if (currentLeader) {
        const newLeaderOrder = currentLeader.order + 1;
        console.log('newLeaderOrder', newLeaderOrder);
        const newLeader = players.find((player) => {
            if (newLeaderOrder >= players.length) {
                return player.order === 0;
            }
            return player.order === newLeaderOrder;
        });
        currentLeader.isCurrentLeader = false;
        await currentLeader.save();
        if (newLeader) {
            newLeader.isCurrentLeader = true;
            await newLeader.save();
            return newLeader.socketId;
        }
    }
    return '';
};
exports.switchToNextLeader = switchToNextLeader;
// TODO maybe return the game state
const handleGlobalVote = async (roomCode) => {
    const players = await (0, exports.getPlayerList)(roomCode);
    const playerCount = players.length;
    const votedPlayers = players.filter((player) => !!player.globalVote);
    const roomState = await (0, exports.getRoom)(roomCode);
    if (roomState && votedPlayers.length === playerCount) {
        roomState.globalVoteInProgress = false;
        roomState.revealVotes = true;
        const votedInFavor = players.filter((player) => player.globalVote === 'yes');
        if (votedInFavor.length > votedPlayers.length / 2) {
            roomState.questVoteInProgress = true;
            roomState.missedTeamVotes = 1;
        }
        else {
            const newLeaderId = await (0, exports.switchToNextLeader)(roomCode);
            roomState.questVoteInProgress = false;
            roomState.nominationInProgress = true;
            roomState.missedTeamVotes = roomState?.missedTeamVotes + 1;
            roomState.currentLeaderId = newLeaderId;
        }
        await roomState.save();
        if (roomState.missedTeamVotes === 5) {
            return {
                gameEnded: true,
                goodWon: false,
            };
        }
    }
    return null;
};
exports.handleGlobalVote = handleGlobalVote;
const clearVotes = async (roomCode) => {
    await (0, exports.updateAllPlayers)(roomCode, { globalVote: null, questVote: null });
    // await updateRoom(roomCode, { revealVotes: false });
};
exports.clearVotes = clearVotes;
const startNewVoteCycle = async (roomCode) => {
    await (0, exports.updateAllPlayers)(roomCode, { globalVote: null, questVote: null });
    // await switchToNextLeader(roomCode);
};
exports.startNewVoteCycle = startNewVoteCycle;
const handleQuestVote = async (roomCode) => {
    const players = await (0, exports.getPlayerList)(roomCode);
    const nominatedPlayers = players.filter((player) => player.nominated);
    const nominatedPlayersCount = nominatedPlayers.length;
    const votedPlayers = players.filter((player) => !!player.questVote);
    const roomState = await (0, exports.getRoom)(roomCode);
    const nextQuestNumber = roomState?.currentQuest + 1;
    if (roomState && votedPlayers.length === nominatedPlayersCount) {
        const votedInFavor = players.filter((player) => player.questVote === 'yes');
        const newLeaderId = await (0, exports.switchToNextLeader)(roomCode);
        roomState.questVoteInProgress = false;
        roomState.nominationInProgress = true;
        roomState.revealVotes = false;
        roomState.currentLeaderId = newLeaderId;
        roomState.currentQuestResults = votedPlayers.map((player) => !!player.questVote);
        if (votedInFavor.length > votedPlayers.length / 2) {
            await (0, exports.updateQuestResult)(roomCode, roomState?.currentQuest, 'success');
        }
        else {
            await (0, exports.updateQuestResult)(roomCode, roomState?.currentQuest, 'fail');
        }
        roomState.currentQuest = nextQuestNumber;
        await roomState.save();
        await (0, exports.clearVotes)(roomCode);
        const gameEnd = await (0, exports.checkForEndGame)(roomCode);
        // Need this check in case the quest is selected manually
        if (gameEnd.gameEnded) {
            return gameEnd;
        }
        else {
            await (0, exports.changeActiveQuest)(roomCode, nextQuestNumber);
        }
    }
    return null;
};
exports.handleQuestVote = handleQuestVote;
const checkForEndGame = async (roomCode) => {
    const quests = await db_1.AvalonQuest.findAll({
        where: {
            roomCode,
            questResult: {
                [sequelize_1.Op.not]: null,
            },
        },
    });
    const wonQuests = quests.filter((quest) => quest.questResult === 'success');
    const failedQuests = quests.filter((quest) => quest.questResult === 'fail');
    return {
        gameEnded: wonQuests.length === 3 || failedQuests.length === 3,
        goodWon: wonQuests.length === 3,
    };
};
exports.checkForEndGame = checkForEndGame;
const restoreDefaults = async (roomCode) => { };
exports.restoreDefaults = restoreDefaults;
