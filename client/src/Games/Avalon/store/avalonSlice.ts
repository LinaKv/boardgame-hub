import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../../app/store';

import { AvalonRoomServer } from './types';

export interface AvalonPlayer {
    socketId: string;
    roomCode: string;
    name: string;
    role: string;
    isHost: boolean;
    isCurrentLeader: boolean;
    order: number;
    nominated: boolean;
}

interface ConnectionState {
    isConnected: boolean;
    isEstablishingConnection: boolean;
}

type Vote = 'yes' | 'no' | null;

// TODO split in two types - one common with server and the rest is FE specific
export interface AvalonState extends ConnectionState {
    players: AvalonPlayer[];
    hostSocketId: string;
    socketId: string;
    currentQuest: number;
    currentLeader: string | null;
    nominatedPlayers: string[];
    nominationInProgress: boolean;
    globalVoteInProgress: boolean;
    globalVote: Vote;
    revealVotes: boolean;
    // hasVoted: boolean;
    questVoteInProgress: boolean;
    questVote: Vote;
    extraRoles: string[];
    missedTeamVotes: number;
    questHistory: boolean[];
    leaderCanSelectQuest: boolean;
    gameInProgress: boolean;
    quests: number[];
    role: string;
    nominated: boolean;
    votedPlayers: string[];
}

const initialState: AvalonState = {
    players: [],
    currentQuest: 1,
    currentLeader: null,
    nominatedPlayers: [],
    extraRoles: [],
    missedTeamVotes: 1,
    quests: [0, 0, 0, 0, 0],
    questHistory: [],
    leaderCanSelectQuest: false,
    gameInProgress: false,
    isEstablishingConnection: false,
    isConnected: false,
    hostSocketId: '',
    socketId: '',
    role: '',
    nominated: false,
    nominationInProgress: false,
    globalVoteInProgress: false,
    globalVote: null,
    questVoteInProgress: false,
    questVote: null,
    revealVotes: false,
    votedPlayers: [],
};

// export const connect = createAsyncThunk('avalon/connect', async () => {
//     return io(`http://${window.location.hostname}:3001/avalon`);

//     // The value we return becomes the `fulfilled` action payload
//     // return response.data;
// });

export const avalonSlice = createSlice({
    name: 'avalon',
    initialState,

    reducers: {
        startConnecting: (state, action: PayloadAction<string>) => {
            state.isEstablishingConnection = true;
        },
        connectionEstablished: (state, action) => {
            state.isConnected = true;
            state.isEstablishingConnection = true;
            state.socketId = action.payload;
        },
        disconnect: (state) => {
            state = { ...initialState };
        },
        receivePlayers: (state, action: PayloadAction<any[]>) => {
            state.players = action.payload.sort((a, b) => a.order - b.order);
        },
        receiveQuests: (state, action: PayloadAction<any[]>) => {
            state.quests = action.payload;
        },
        startGame: (state) => {
            state.gameInProgress = true;
        },
        nominatePlayer: (state, action: PayloadAction<string>) => {},
        updateRoom: (state, action: PayloadAction<AvalonRoomServer>) => {
            console.log(action.payload);
            state.players = action.payload.AvalonPlayers.sort((a, b) => a.order - b.order);

            state.nominated = action.payload.AvalonPlayers.some(
                (player) => player.nominated && player.socketId === state.socketId,
            );
            state.currentQuest = action.payload.currentQuest;
            state.missedTeamVotes = action.payload.missedTeamVotes;
            state.nominationInProgress = action.payload.nominationInProgress;
            state.globalVoteInProgress = action.payload.globalVoteInProgress;
            state.questVoteInProgress = action.payload.questVoteInProgress;
            state.currentLeader = action.payload.currentLeaderId;
            if (state.revealVotes !== action.payload.revealVotes) {
                state.votedPlayers = [];
                state.revealVotes = action.payload.revealVotes;
            }

            // @ts-ignore
            state.quests = action.payload.AvalonQuests.sort((a, b) => a.questNumber - b.questNumber);
        },
        globalVote: (state, action: PayloadAction<'yes' | 'no'>) => {},
        questVote: (state, action: PayloadAction<'yes' | 'no'>) => {},
        assignRole: (state, action: PayloadAction<string>) => {
            state.role = action.payload;
        },
        confirmParty: (state) => {
            state.votedPlayers = [];
            // state.globalVoteInProgress = true;
        },
        addPlayerToVotedList: (state, action: PayloadAction<string>) => {
            state.votedPlayers.push(action.payload);
        },
    },
});

export const {
    receivePlayers,
    startConnecting,
    connectionEstablished,
    disconnect,
    receiveQuests,
    startGame,
    nominatePlayer,
    updateRoom,
    assignRole,
    confirmParty,
    addPlayerToVotedList,
    globalVote,
    questVote,
} = avalonSlice.actions;

export const getAllPlayers = (state: RootState) => state.avalon.players;
export const getQuests = (state: RootState) => state.avalon.quests;

export const selectCurrentLeader = (state: RootState) => state.avalon.currentLeader;
export const isCurrentLeader = (state: RootState) => state.avalon.currentLeader === state.avalon.socketId;

export const selectHost = (state: RootState) => state.avalon.players?.find((player) => player.isHost)?.socketId;
export const isHost = (state: RootState) =>
    state.avalon.players?.find((player) => player.isHost)?.socketId === state.avalon.socketId;

export const selectMissedVotes = (state: RootState) => state.avalon.missedTeamVotes;

export const selectRole = (state: RootState) => state.avalon.role;

export const shouldShowVoteButtons = (state: RootState) =>
    state.avalon.globalVoteInProgress ||
    (state.avalon.questVoteInProgress &&
        state.avalon.nominated &&
        !state.avalon.votedPlayers.includes(state.avalon.socketId));

export default avalonSlice.reducer;
