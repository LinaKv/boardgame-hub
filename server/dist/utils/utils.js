"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shuffle = void 0;
const shuffle = (a, b, c, d) => {
    //array,placeholder,placeholder,placeholder
    c = a.length;
    while (c)
        (b = (Math.random() * c--) | 0), (d = a[c]), (a[c] = a[b]), (a[b] = d);
    return a;
};
exports.shuffle = shuffle;
