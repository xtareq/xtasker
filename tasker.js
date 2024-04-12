/**
 *@description powerful cli task management app
 *@author Tareq Hossain
 *@external https://github.com/xtareq/xtasker
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

const cmds = {
	task_list_all: ['list_all:', 'la:'],
	task_list_open: ['list_open:', 'lo'],
	task_list_done: ['list_done:', 'ld'],
	new_task: ['add_task:', 'at:'],
	edit_task: ['edit_task:', 'et:'],
	delete_task: ['delete_task:', 'dt:'],
	delete_all_task: ['delete_all:', 'dat:'],
	group_list: ['list_group:', 'lg:'],
	add_group: ['add_group:', 'ag:'],
	edit_group: ['edit_group:', 'eg:'],
	delete_group: ['delete_group:', 'dg:']
}

// global variables
let groupId = 1;
let taskStatus = 'open';

async function ensureDbFile() {
	if (!fs.existsSync(dbPath)) {
		fs.mkdirSync(dbPath, 0o777);
	}

	if (!fs.existsSync(dbFilePath)) {
		fs.closeSync(fs.openSync(dbFilePath, 'w'));
	}
}

async function initDB() {

	const groupSql = `
	CREATE TABLE IF NOT EXISTS groups(
		groupId INTEGER PRIMARY KEY AUTOINCREMENT,
		groupName VARCHAR(100) NOT NULL
	)`;
	const taskSql = `
	CREATE TABLE IF NOT EXISTS tasks (
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
	console.log('='.repeat(process.stdout.columns))
	console.log('||📋XTASKER >> ' + BG_COLORS.GREEN + ' ' + group.groupName.toUpperCase() + ' ' + RESET + ' >> Total - ' + tasks.length + ' | 🟡Open - ' + toatalOpen + ' | ✅Done - ' + totalDone + ' ||')
	console.log('-'.repeat(process.stdout.columns))
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
	rl.question(`${COLORS.PURPLE}${group.groupName.toLowerCase()}${RESET}> `, (input) => {
		executeCommand(input);
	})
}

function displayHelp() {
	console.clear();
	console.log('='.repeat(process.stdout.columns))
	console.log('||📋XTASKER >> HELP ||')
	console.log('-'.repeat(process.stdout.columns))
	console.log(COLORS.GREEN + 'BASIC COMMANDS:' + RESET);
	console.log('===Tasks===')
	console.log('1. la : - display all tasks')
	console.log('2. lo : - display open tasks')
	console.log('3. ld : - display done tasks')
	console.log('4. at : - add new task ')
	console.log('5. et : <taskId> - edit task')
	console.log('6. dt : <taskId> - task to delete')
	console.log('7. da : delete all tasks')
	console.log('8. mad: <taskId> - mark as done')
	console.log('')
	console.log('===Groups===')
	console.log('9.  lg : - display all groups')
	console.log('10. sg : <groupId> - switch between groups')
	console.log('11. ng : <groupName> - add new group ')
	console.log('12. eg : <groupId> - edit group')
	console.log('13. xg : <groupId> - delete group')
	console.log('')
	console.log('===Others===')
	console.log('14. cl : - clear screen')
	console.log('15.  q : - quit')
	console.log('')

	inputCommand();
}

async function displayGroups() {
	const groups = await getAllGroups();
	groups.sort((a, b) => b.groupId - a.groupId)
	console.clear();
	console.log('='.repeat(process.stdout.columns))
	console.log(`||📋XTASKER >> GROUP LIST(${groups.length})`)
	console.log('-'.repeat(process.stdout.columns))
	console.log('  ', BOLD + UNDERLINE + 'GroupID' + RESET, '  ' + BOLD + UNDERLINE + 'Name' + RESET)
	groups.forEach(task => {
		console.log('📒', '', task.groupId.toString().padStart(3, "0"), '   ', task.groupName)
	})
	console.log('')
	inputCommand();
}

/**
 * execute command
 * @param {input} input 
 * @returns mix
 * */
async function executeCommand(input) {
	const cmdline = input.split(':');
	if (cmdline.length < 2) {
		console.log(COLORS.RED + '🛑ERROR: missing colon(:) at the end of command eg ' + input + ':' + RESET);
		inputCommand();
		return;
	}

	const cmd = cmdline[0].trim();
	const args = cmdline[1].trim();

	if (['list_group', 'lg'].includes(cmd)) {
		displayGroups();
	} else if (['add_group', 'ag'].includes(cmd)) {
		addNewGroup(args);
		displayGroups();
	} else if (cmd == 'sg') {
		const groupDetail = await getGroupDetail(args);
		if (groupDetail) {
			groupId = parseInt(args);
			main();
		} else {
			console.log(COLORS.RED + 'ERROR: group not found by id ' + args + RESET)
			inputCommand()
		}
	} else if (['delete_group', 'dg'].includes(cmd)) {
		if (args == 1) {
			console.log(`${COLORS.RED} ERROR: Default group can\'t be deleted.${RESET}`);
			inputCommand();
		} else {
			rl.question(`Are you sure you want to delete this group with ID ${args} and all its tasks? (y/n): `, (answer) => {
				if (answer.toLowerCase() === 'yes' || answer.toLowerCase() == 'y') {
					removeGroup(args);
					groupId = 1;
					console.log('Group removed Successfullay.');
				}
				reload()
			});
		}
	} else if (['h', 'help'].includes(cmd)) {
		displayHelp()
	} else if (['q', 'quit', 'exit'].includes(cmd)) {
		db.close();
		rl.close();
	} else if (cmd == 'la') {
		console.clear();
		taskStatus = 'all';
		main();
	} else if (cmd == 'lo') {
		console.clear();
		taskStatus = 'open';
		main();
	} else if (cmd == 'ld') {
		taskStatus = 'done';
		console.clear();
		main();
	} else if (['add', 'at'].includes(cmd)) {
		if (args.length > 2) {
			addNewTask({ body: args, groupId })
			console.log('Task Added Successfullay.');
			reload();
		} else {
			console.log(COLORS.RED + 'ERROR: Task description can\'t be empty' + RESET);
			inputCommand();
		}
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
	} else if (cmd == 'da') {

		rl.question(`Are you sure? (y/n): `, (answer) => {
			if (answer.toLowerCase() === 'yes' || answer.toLowerCase() == 'y') {
				removeAllTask(groupId);
				console.log('Task removed Successfullay.');
			}
			reload()
		});
	} else if (cmd == 'dt') {
		rl.question(`Are you sure you want to delete task with ID ${args}? (y/n): `, (answer) => {
			if (answer.toLowerCase() === 'yes' || answer.toLowerCase() == 'y') {
				removeTask(args);
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
	} else if (cmd == 'mad') {
		completeTask(args);
		console.log('Task completed Successfullay.');
		reload()
	} else if (input == 6) {
		rl.question('Enter TaskID: ', (taskId) => {
			completeTask(taskId);
			console.log('Task completed Successfullay.');
			reload()
		})
	} else if (['clear', 'cls'].includes(cmd)) {
		reload();
	} else {
		console.log(COLORS.RED + '❗ERROR: Unknown command' + RESET)
		console.log('Hint: use h: or help: for available commands')
		inputCommand()
	}
}

async function main(message = null, error = false) {
	await ensureDbFile();
	await initDB();
	console.clear();
	if (message) {
		console.log(message);
	}
	if (!error) {
		await loadTasks();
	}
	await inputCommand()
	//db.close();
}

module.exports = main

