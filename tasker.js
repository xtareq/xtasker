/**
 *@description powerful todo app for cli lover
 *@author Tareq Hossain
 *@external https://github.com/xtareq/tasker
 */


const path = require('path');
const fs = require('fs');
const os = require('os');
const sqlite3 = require('sqlite3').verbose();
const tw = process.stdout.columns;
const readline = require('readline');
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});
const dbPath = path.join(path.resolve(os.homedir()), 'tasker/');
const dbFilePath = dbPath + 'tasker.db';
const db = new sqlite3.Database(dbFilePath);


// ansii color codes
const COLORS = {
	RED: "\x1b[31m",
	GREEN: "\x1b[32m",
	YELLOW: "\x1b[33m",
	BLUE: "\x1b[34m",
	PURPLE: "\x1b[35m",
	CYAN: "\x1b[36m",
	WHITE: "\x1b[37m"
}

const BG_COLORS = {
	GREEN: "\u001b[42m",
	BLUE: "\u001b[44m",
	PURPLE: "\u001b[45m"
}
const BOLD = "\u001b[1m";
const UNDERLINE = "\u001b[4m";
const RESET = "\x1b[0m";

// global variables
let groupId = 1;
let taskStatus = 'open';

function ensureDbFile() {
	if (!fs.existsSync(dbPath)) {
		fs.mkdirSync(dbPath, 0o777);
	}

	if (!fs.existsSync(dbFilePath)) {
		fs.closeSync(fs.openSync(dbFilePath, 'w'));
	}
}

async function initDB() {

	const groupSql = `CREATE TABLE IF NOT EXISTS groups(
groupId INTEGER PRIMARY KEY AUTOINCREMENT,
groupName VARCHAR(100) NOT NULL
	)`;
	const taskSql = `CREATE TABLE IF NOT EXISTS tasks (
taskId INTEGER PRIMARY KEY AUTOINCREMENT,
groupId INTEGER NOT NULL DEFAULT 1,
body TEXT NOT NULL,
completed INTEGER NOT NULL DEFAULT 0,
archived INTEGER NOT NULL DEFAULT 0
)`;

	const isExists = await getGroupDetail(1);

	db.serialize(() => {
		db.run(groupSql);
		db.run(taskSql);

		if (!isExists) {
			const insertInitialGroup = `INSERT INTO groups(groupName) VALUES(?)`;
			const stmt = db.prepare(insertInitialGroup);
			stmt.run('General');
			stmt.finalize();
		}

	});

	return true;

}

function getAllTasks(groupId) {
	return new Promise((resolve, reject) => {
		const tasks = [];
		db.serialize(() => {
			db.each(`SELECT * FROM tasks WHERE groupId='${groupId}'`, (err, row) => {
				if (err) {
					console.log(err);
					reject(err);
					return;
				}
				tasks.push(row);
			}, () => {
				resolve(tasks);
			});
		});
	});

}

function getAllGroups() {
	return new Promise((resolve, reject) => {
		const groups = [];
		db.serialize(() => {
			db.each(`SELECT * FROM groups`, (err, row) => {
				if (err) {
					console.log(err);
					reject(err);
					return;
				}
				groups.push(row);
			}, () => {
				resolve(groups);
			});
		});
	});

}


function getGroupDetail(groupId) {
	return new Promise((resolve, reject) => {
		const groups = [];
		db.serialize(() => {
			db.each(`SELECT * FROM groups WHERE groupId='${groupId}'`, (err, row) => {
				if (err) {
					console.log(err);
					reject(err);
					return;
				}
				groups.push(row);
			}, () => {
				resolve(groups[0]);
			});
		})
	})
}

function addNewTask(task) {
	db.serialize(() => {
		const stmt = db.prepare(`INSERT INTO tasks(body, groupId) VALUES(?,?)`);
		stmt.run(task.body, groupId);

		stmt.finalize()
	});
}


function addNewGroup(groupName) {
	db.serialize(() => {
		const stmt = db.prepare(`INSERT INTO groups(groupName) VALUES(?)`);
		stmt.run(groupName);

		stmt.finalize()
	});
}

function removeGroup(gid) {
	removeAllTask(gid);
	const sql = 'DELETE FROM groups WHERE groupId = ?';
	db.run(sql, [gid], function(err) {
		if (err) {
			console.error(err.message);
			return;
		}
		console.log(`Deleted ${this.changes} group`);
	});

}

function removeTask(id) {
	const sql = 'DELETE FROM tasks WHERE taskId = ?';
	db.run(sql, [id], function(err) {
		if (err) {
			console.error(err.message);
			return;
		}
		console.log(`Deleted ${this.changes} task(s)`);
	});
}

function removeAllTask(gid) {
	const sql = 'DELETE FROM tasks WHERE groupId = ?'
	db.run(sql, [gid], function(err) {
		if (err) {
			console.log(err);
			return;
		}
	})
}

function completeTask(id) {
	const sql = 'UPDATE tasks SET completed = 1 WHERE taskId = ?';
	db.run(sql, [id], function(err) {
		if (err) {
			console.error(err.message);
			return;
		}
		console.log(`Task with ID ${id} marked as completed`);
	});
}


async function loadTasks() {
	let showTasks = [];
	const group = await getGroupDetail(groupId);
	const tasks = await getAllTasks(groupId);

	tasks.sort((a, b) => b.taskId - a.taskId)
	tasks.sort((a, b) => (a.completed - b.completed));
	const openTasks = tasks.filter(x => x.completed == 0)
	const toatalOpen = openTasks.length
	const completedTasks = tasks.filter(x => x.completed == 1)
	const totalDone = tasks.length - toatalOpen
	if (taskStatus == 'open') {
		showTasks = openTasks;
	} else if (taskStatus == 'done') {
		showTasks = completedTasks
	} else {
		showTasks = tasks;
	}
	console.log('='.repeat(tw))
	console.log('||📋TASKER >> ' + BG_COLORS.GREEN + ' ' + group.groupName.toUpperCase() + ' ' + RESET + ' >> Total - ' + tasks.length + ' | 🟡Open - ' + toatalOpen + ' | ✅Done - ' + totalDone + ' ||')
	console.log('-'.repeat(tw))
	console.log('  ', BOLD + UNDERLINE + 'TaskID' + RESET, '  ' + BOLD + UNDERLINE + 'Description' + RESET)
	showTasks.forEach(task => {
		console.log(task.completed == 1 ? '✅' : '🟡', '', task.taskId.toString().padStart(3, "0"), '   ', task.body)
	})
	console.log('')
}


function confirmDelete(id) {
	return;
}


function reload() {
	console.log('Relaoding task list....')
	setTimeout(() => {
		console.clear();
		main();
	}, 500);
}

async function inputCommand() {
	const group = await getGroupDetail(groupId);
	rl.question(`${COLORS.PURPLE}${group.groupName.toLowerCase()}${RESET}$ `, (input) => {
		executeCommand(input);
	})
}

function displayHelp() {
	console.clear();
	console.log('=========================================================')
	console.log('||📋TASKER >> HELP ||')
	console.log('=========================================================')
	console.log(COLORS.GREEN + 'COMMANDS:(use command number or alias)' + RESET + '\n\t1.AllTasks \n\t2.OpenTasks | 3.CompletedTasks | 4.AddNew (add:<task>) | 5.Remove (rm:<taskId>) | 6.MarkAsComplete')
	console.log('For exit write "exit" or "q"')
	inputCommand();
}

async function displayGroups() {
	const groups = await getAllGroups();

	groups.sort((a, b) => b.groupId - a.groupId)
	console.clear();
	console.log('='.repeat(tw))
	console.log(`||📋TASKER >> GROUP LIST(${groups.length})`)
	console.log('-'.repeat(tw))
	console.log('  ', BOLD + UNDERLINE + 'GroupID' + RESET, '  ' + BOLD + UNDERLINE + 'Name' + RESET)
	groups.forEach(task => {
		console.log('🟡', '', task.groupId.toString().padStart(3, "0"), '   ', task.groupName)
	})
	console.log('')
	inputCommand();
}

async function executeCommand(input) {
	if (input == 'groups:' || input == 7) {
		displayGroups();
	} else if (input.includes('add_group:')) {
		const groupName = input.split(':')[1];
		addNewGroup(groupName.trim(' '));
		executeCommand(7);
	} else if (input.includes('sw_group:') || input.includes('sw:')) {

		const gId = input.split(':')[1];
		const groupDetail = await getGroupDetail(gId);
		if (groupDetail) {
			groupId = parseInt(gId);
		} else {
			console.log('group not found')
		}
		main();
	} else if (input.includes('rm_group:')) {
		const gId = input.split(":")[1];

		if (gId == 1) {
			console.log(`${COLORS.RED} ERROR: Default group can\'t be deleted.${RESET}`);
			setTimeout(() => {
				reload();
			}, 1500)
		} else {
			rl.question(`Are you sure you want to delete this group with ID ${groupId} and all its tasks? (y/n): `, (answer) => {
				if (answer.toLowerCase() === 'yes' || answer.toLowerCase() == 'y') {
					removeGroup(gId);
					groupId = 1;
					console.log('Group removed Successfullay.');
				}
				reload()
			});
		}


	} else if (input == 'h:' || input == 'help:') {
		displayHelp()
	} else if (input == 'q' || input == 'exit') {
		db.close();
		rl.close();
	} else if (input == 1) {
		console.clear();
		taskStatus = 'all';
		main();
	} else if (input == 2) {
		console.clear();
		taskStatus = 'open';
		main();
	} else if (input == 3) {
		taskStatus = 'done';
		console.clear();
		main();
	} else if (input.includes("add:")) {
		const task = input.split(':')[1];
		if (task.length > 2) {
			addNewTask({ body: task.trim(' '), groupId })
			console.log('Task Added Successfullay.');
		} else {
			console.log('Task description can\'t be empty')
		}
		reload()
	} else if (input == 4) {
		rl.question('Task description: ', (newTask) => {
			if (newTask.length < 1) {
				console.log('Task description can\'t be empty')
			} else {
				addNewTask({ body: newTask });
				console.log('Task Added Successfullay.');
			}
			reload()
		})
	} else if (input.includes('rmall:')) {

		rl.question(`Are you sure? (y/n): `, (answer) => {
			if (answer.toLowerCase() === 'yes' || answer.toLowerCase() == 'y') {
				removeAllTask(groupId);
				console.log('Task removed Successfullay.');
			}
			reload()
		});
	} else if (input.includes('rm:')) {
		const taskId = input.split(":")[1]

		rl.question(`Are you sure you want to delete task with ID ${taskId}? (y/n): `, (answer) => {
			if (answer.toLowerCase() === 'yes' || answer.toLowerCase() == 'y') {
				removeTask(taskId);
				console.log('Task removed Successfullay.');
			}
			reload()
		});
	} else if (input == 5) {
		rl.question('Enter TaskID: ', (taskId) => {
			rl.question(`Are you sure you want to delete task with ID ${taskId}? (y/n): `, (answer) => {
				if (answer.toLowerCase() === 'yes' || answer.toLowerCase() == 'y') {
					removeTask(taskId);
					console.log('Task removed Successfullay.');
				}
				reload()
			});
		})
	} else if (input == 6) {
		rl.question('Enter TaskID: ', (taskId) => {
			completeTask(taskId);
			console.log('Task completed Successfullay.');
			reload()
		})
	} else {
		console.clear();
		main('❗ERROR: Unknown command!', true)
	}
}

async function main(message = null, error = false) {
	ensureDbFile();
	await initDB();
	console.clear();
	if (message) {
		console.log(message);
	}
	if (!error) {
		await loadTasks();
	}
	inputCommand()
	//db.close();
}

module.exports = main

