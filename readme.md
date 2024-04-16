# Xtasker - Cli task management
Xtasker is a simple and liteweight commandline task management tool.

![alt text](https://i.ibb.co/ZNHybr8/screenshot.png)

## Installation
```sh
npm i -g xtasker 
# pnpm add -g xtasker
# yarn add -g xtasker
```
Note: After installtaion restart your terminal and run
```sh
xtasker
```

## Usages

### Basic Commands
<b>Tasks</b>
- la: - Load all tasks
- lo: - Load open tasks
- ld: - Load done tasks
- at: <task_description> - Add new task
- et: <taskId> - Edit task
- dt: <taskId> - Delete task
- da: - Delete all tasks 
- mad: <taskId> - Mark as done

<b> Groups </b>
- lg: - Load all groups
- sg: <groupId> - Switch group by groupId
- ag: <groupName> - Add new group
- dg: <groupId> - Delete group by id

<b> Others 
- cl: - Clear window 
- h: - Help menu

