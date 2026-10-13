'use strict';
const bcrypt = require('bcryptjs');

const ROUNDS = 12;
const hashPassword = (plain) => bcrypt.hash(String(plain), ROUNDS);
const verifyPassword = (plain, hash) => (hash ? bcrypt.compare(String(plain), hash) : Promise.resolve(false));

module.exports = { hashPassword, verifyPassword };
