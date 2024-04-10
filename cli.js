#!/usr/bin/env node

const tasker = require('./tasker');


tasker().catch(err => console.log(err))
