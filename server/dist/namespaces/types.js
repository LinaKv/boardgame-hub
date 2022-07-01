"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLES = exports.DEFAULT_ROLES = exports.ROLE_LIST = exports.SIDES = void 0;
var SIDES;
(function (SIDES) {
    SIDES["GOOD"] = "GOOD";
    SIDES["EVIL"] = "EVIL";
})(SIDES = exports.SIDES || (exports.SIDES = {}));
var ROLE_LIST;
(function (ROLE_LIST) {
    ROLE_LIST["MINION"] = "MINION";
    ROLE_LIST["SERVANT"] = "SERVANT";
    ROLE_LIST["ASSASSIN"] = "ASSASSIN";
    ROLE_LIST["MERLIN"] = "MERLIN";
    ROLE_LIST["PERCIVAL"] = "PERCIVAL";
    ROLE_LIST["MORDRED"] = "MORDRED";
    ROLE_LIST["OBERON"] = "OBERON";
    ROLE_LIST["MORGANA"] = "MORGANA";
})(ROLE_LIST = exports.ROLE_LIST || (exports.ROLE_LIST = {}));
exports.DEFAULT_ROLES = [ROLE_LIST.MERLIN, ROLE_LIST.ASSASSIN, ROLE_LIST.MINION, ROLE_LIST.SERVANT];
exports.ROLES = {
    [ROLE_LIST.MINION]: {
        roleName: 'Minion of Evil',
        side: SIDES.EVIL,
        ability: 'No special abilities',
        key: ROLE_LIST.MINION,
    },
    [ROLE_LIST.SERVANT]: {
        roleName: 'Loyal Servant of Arthur',
        side: SIDES.GOOD,
        ability: 'No special abilities',
        key: ROLE_LIST.SERVANT,
    },
    [ROLE_LIST.ASSASSIN]: {
        roleName: 'Assassin',
        side: SIDES.EVIL,
        ability: 'If Evil side looses then Assassin get to decided who to kill. If Merlin is chosen then Evil wins.',
        key: ROLE_LIST.ASSASSIN,
    },
    [ROLE_LIST.MERLIN]: {
        roleName: 'Merlin',
        side: SIDES.GOOD,
        ability: 'Knows who plays on the side of evil. But be careful - if the forces of Good win but you are killed by an Assassin then the Evil will triumph',
        key: ROLE_LIST.MERLIN,
    },
    [ROLE_LIST.PERCIVAL]: { roleName: 'Percival', side: SIDES.GOOD, ability: 'Knows Merlin', key: ROLE_LIST.PERCIVAL },
    [ROLE_LIST.MORDRED]: {
        roleName: 'Mordred',
        side: SIDES.EVIL,
        ability: 'Does not reveal himself to Merlin',
        key: ROLE_LIST.MORDRED,
    },
    [ROLE_LIST.OBERON]: {
        roleName: 'Oberon',
        side: SIDES.EVIL,
        ability: 'Does not reveal himself to either side',
        key: ROLE_LIST.OBERON,
    },
    [ROLE_LIST.MORGANA]: {
        roleName: 'Morgana',
        side: SIDES.EVIL,
        ability: 'Appears as Merlin to Percival',
        key: ROLE_LIST.MORGANA,
    },
};
