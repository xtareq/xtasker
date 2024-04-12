## WARNING:: it's not production ready yet. you may face bugs and crashes along the way

# Xtasker - Cli task management
Xtasker is a simple and liteweight commandline task management tool.

![alt text](https://i.ibb.co/ZNHybr8/screenshot.png)

## Installation
```sh
npm i -g xtasker

```
Note: After installtaion restart your terminal and run
```sh
xtasker
```

## Usages

### Basic Commands
<b>Tasks</b>
- la: - load all tasks
- lo: - load open tasks
- ld: - load done tasks
- at: <task_description> - add new task
- et: <taskId> - edit task // yet to implemented
- dt: <taskId> - delete task
- da: - delete all tasks 
- mad: <taskId> - mark as done

<b> Groups </b>
- lg: - load all groups
- sg: <groupId | groupName> - switch between group by groupId or name
- ag: <groupName> - add new group
- dg: <groupId> - delete group by id

<b> Others 
- cl: - clear window 
- h: - help menu

