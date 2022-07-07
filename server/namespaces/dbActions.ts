import { AvalonRoom, AvalonPlayer, AvalonQuest } from '../config/db';
import { AvalonPlayerType } from '../models/AvalonPlayer';
import { AvalonRoomType } from '../models/AvalonRoom';
import { createRoleDistributionArray, DISTRIBUTION } from './engine';

export const getPlayerList = async (roomCode: string) => {
    const players = await AvalonPlayer.findAll({
        where: {
            roomCode,
        },
        order: [['order', 'ASC']],
    });
    return players;
};

export const createPlayer = async (player: AvalonPlayerType) => {
    await AvalonPlayer.create(player);
};

export const updatePlayer = async ({
    socketId,
    updatedProperties,
}: {
    socketId: string;
    updatedProperties: Partial<AvalonPlayerType>;
}) => {
    await AvalonPlayer.update(updatedProperties, {
        where: {
            socketId: socketId,
        },
    });
};
export const updateAllPlayers = async (roomCode: string, updatedProperties: Partial<AvalonPlayerType>) => {
    await AvalonPlayer.update(updatedProperties, {
        where: {
            roomCode,
        },
    });
};

// TODO make appropriate changes if at some point the same socket will be used for multiple rooms
export const findAndDeletePlayer = async (socketId: string) => {
    try {
        const player = await AvalonPlayer.findOne({
            where: {
                socketId,
            },
        });
        if (player) {
            await AvalonPlayer.destroy({
                where: {
                    socketId,
                },
            });
        }
    } catch (e) {
        console.log(e);
    }
};

// export const getPlayerRole = async (roomCode: string, socketId: string) => {
//     const player = await AvalonPlayer.findOne({
//         where: {
//             roomCode,
//             socketId,
//         },
//     });
//     return player?.role;
// };

export const getPlayerBySocketId = async (roomCode: string, socketId: string) => {
    const player = await AvalonPlayer.findOne({
        where: {
            roomCode,
            socketId,
        },
    });
    return player;
};
export const countPlayers = async (roomCode: string, condition?: Record<string, any>) => {
    const playerCount = await AvalonPlayer.count({
        where: {
            roomCode,
            ...condition,
        },
    });
    return playerCount;
};

export const nominatePlayer = async (roomCode: string, playerId: string) => {
    const selectedPlayer = await getPlayerBySocketId(roomCode, playerId);
    if (selectedPlayer) {
        selectedPlayer.nominated = selectedPlayer.nominated ? false : true;
        await selectedPlayer.save();
    }
};

// ROOM
export const removeRoomAndPlayers = async (roomCode: string) => {
    const room = await AvalonRoom.findOne({
        where: {
            roomCode,
        },
    });
    if (room) {
        await Promise.all([
            AvalonRoom.destroy({
                where: {
                    roomCode,
                },
            }),
            AvalonPlayer.destroy({
                where: {
                    roomCode,
                },
            }),
        ]);
    }
};

export const getRoomWithPlayers = async (roomCode: string) => {
    const room = await AvalonRoom.findOne({
        where: {
            roomCode,
        },
        include: [
            { model: AvalonPlayer, order: [['order', 'ASC']], attributes: { exclude: ['role', 'side'] } },
            { model: AvalonQuest, order: [['questNumber', 'ASC']] },
        ],
    });

    return room;
};

export const createRoom = async (roomCode: string, socketId: string) => {
    return await AvalonRoom.findOrCreate({
        where: {
            roomCode,
        },
        defaults: {
            roomCode,
            hostSocketId: socketId,
        },
    });
};

export const getRoom = async (roomCode: string) => {
    const room = await AvalonRoom.findOne({
        where: {
            roomCode,
        },
    });
    return room;
};

export const updateRoom = async (roomCode: string, newData: Partial<AvalonRoomType>) => {
    await AvalonRoom.update(newData, {
        where: {
            roomCode,
        },
    });
};

// QUEST
type Quest = {
    roomCode: string;
    questNumber: number;
    questPartySize: number;
    questResult: 'success' | 'fail' | '';
    active: boolean;
};

// get all quests for a room
export const getQuests = async (roomCode: string) => {
    const quests = await AvalonQuest.findAll({
        where: {
            roomCode,
        },
        order: [['questNumber', 'ASC']],
    });
    return quests;
};

export const initQuests = async (roomCode: string, numberOfPlayers: number) => {
    const { questPartySize } = DISTRIBUTION[numberOfPlayers];
    const quests = await AvalonQuest.findAll({
        where: {
            roomCode,
        },
    });
    if (quests.length) {
        await AvalonQuest.destroy({
            where: {
                roomCode,
            },
        });
    }
    await AvalonQuest.bulkCreate(
        questPartySize.map((partySize: number, i): Quest => {
            return { roomCode, questNumber: i + 1, questPartySize: partySize, questResult: '', active: i === 0 };
        }),
    );
};

export const changeActiveQuest = async (roomCode: string, questNumber: number) => {
    if (questNumber > 5) {
        return;
    }

    const currentActiveQuest = await AvalonQuest.findOne({
        where: {
            roomCode,
            active: true,
        },
    });

    if (currentActiveQuest && currentActiveQuest.questNumber !== questNumber) {
        currentActiveQuest.active = false;
        await currentActiveQuest.save();
    }

    await AvalonQuest.update(
        { active: true },
        {
            where: {
                roomCode,
                questNumber,
            },
        },
    );
};

export const updateQuestResult = async (
    roomCode: string,
    questNumber: number,
    questResult: 'success' | 'fail' | '',
) => {
    await AvalonQuest.update(
        { questResult },
        {
            where: {
                roomCode,
                questNumber,
            },
        },
    );
};

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

export const assignRoles = async (roomCode: string) => {
    const players: any[] = await getPlayerList(roomCode);
    const playerCount = players.length;
    const firstLeaderOrderNumber = Math.floor(Math.random() * playerCount);
    const rolesForPlayers = createRoleDistributionArray(playerCount);
    const updateArray = players.map((player, i) => {
        return updatePlayer({
            socketId: player.socketId,
            updatedProperties: {
                role: rolesForPlayers[i].roleName,
                side: rolesForPlayers[i].side,
                isCurrentLeader: i === firstLeaderOrderNumber,
                order: i,
            },
        });
    });
    await Promise.all(updateArray);
};

export const switchToNextLeader = async (roomCode: string) => {
    const players = await getPlayerList(roomCode);
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

export const handleGlobalVote = async (roomCode: string) => {
    const players = await getPlayerList(roomCode);
    const playerCount = players.length;
    const votedPlayers = players.filter((player) => !!player.globalVote);
    const roomState = await getRoom(roomCode);
    console.log(playerCount, votedPlayers.length, 'COUNTS');

    if (votedPlayers.length === playerCount) {
        console.log('all players voted');

        const votedInFavor = players.filter((player) => player.globalVote === 'yes');
        if (votedInFavor.length > votedPlayers.length / 2) {
            console.log('global vote success');

            await updateRoom(roomCode, {
                globalVoteInProgress: false,
                questVoteInProgress: true,
                revealVotes: true,
                missedTeamVotes: 1,
                // currentQuest: roomState?.currentQuest! + 1,
            });
        } else {
            console.log('global vote fail');
            const newLeaderId = await switchToNextLeader(roomCode);
            await updateRoom(roomCode, {
                globalVoteInProgress: false,
                questVoteInProgress: false,
                nominationInProgress: true,
                revealVotes: true,
                missedTeamVotes: roomState?.missedTeamVotes! + 1,
                // currentQuest: roomState?.currentQuest! + 1,
                currentLeaderId: newLeaderId,
            });
        }
    }
};

export const clearVotes = async (roomCode: string) => {
    await updateAllPlayers(roomCode, { globalVote: null, questVote: null });
    // await updateRoom(roomCode, { revealVotes: false });
};

export const startNewVoteCycle = async (roomCode: string) => {
    await updateAllPlayers(roomCode, { globalVote: null, questVote: null });
    // await switchToNextLeader(roomCode);
};

export const handleQuestVote = async (roomCode: string) => {
    const players = await getPlayerList(roomCode);
    const nominatedPlayers = players.filter((player) => player.nominated);
    const nominatedPlayersCount = nominatedPlayers.length;
    const votedPlayers = players.filter((player) => !!player.questVote);
    const roomState = await getRoom(roomCode);
    const nextQuestNumber = roomState?.currentQuest! + 1;
    if (roomState && votedPlayers.length === nominatedPlayersCount) {
        const votedInFavor = players.filter((player) => player.questVote === 'yes');
        const newLeaderId = await switchToNextLeader(roomCode);

        roomState.questVoteInProgress = false;
        roomState.nominationInProgress = true;
        roomState.revealVotes = false;
        roomState.currentLeaderId = newLeaderId;
        roomState.currentQuestResults = votedPlayers.map((player) => !!player.questVote);

        if (votedInFavor.length > votedPlayers.length / 2) {
            await updateQuestResult(roomCode, roomState?.currentQuest!, 'success');
        } else {
            await updateQuestResult(roomCode, roomState?.currentQuest!, 'fail');
        }
        roomState.currentQuest = nextQuestNumber;
        await roomState.save();
        await clearVotes(roomCode);
        await changeActiveQuest(roomCode, nextQuestNumber);
    }
};
