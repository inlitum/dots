#!/home/jborrie/.nvm/versions/node/v18.12.0/bin/node
const { spawn, execSync } = require("child_process");
const fs = require('fs');

let workspaces = {};

function fetchWorkspaces () {
    let workspace_json;

    try {
        workspace_json = JSON.parse(execSync('i3-msg -t get_workspaces').toString());
    } catch {
        return;
    }
    
    let currentId = 0;
    let temp = [];

    for (let wsj of workspace_json) {
        temp.push ({
            id: wsj.id,
            selectionId: currentId,
            originalName: wsj.name,
            title: wsj.name.split(':')[1],
            focused: wsj.focused,
            monitor: wsj.output,
            urgent: wsj.urgent
        })
    
        currentId++;
    }
    
    temp.sort ((a, b) => {
        return a.originalName.localeCompare(b.originalName);
    })

    for (let workspace of temp) {
        workspaces[workspace.id] = workspace;
    }
}

function initiateSubscriber () {
    const args = ['-t', 'subscribe', '-m', '["workspace"]']
    const child = spawn('i3-msg', args);

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function(data) {
        //Here is where the output goes
        data=data.toString();

        let json;

        try {
            json = JSON.parse(data);
        } catch {
            let events = data.split('\n');

            for (let event of events) {
                try {
                    handleJson(JSON.parse(event));
                } catch {
                    continue;
                }
            }
        }

        handleJson(json);
        generateButtons();
    });
}

function handleJson (json) {
    if (!json || json === '') {
        return;
    }

    switch (json.change) {
        case 'init':
            handleInitEvent (json);
            break;
        case 'focus':
            handleFocusEvent (json);
            break;
        case 'empty':
            handleEmptyEvent (json);
            break;
        case 'urgent':
            handleUrgentEvent (json);
            break;
    }

}

function handleInitEvent (json) {
    // A focus event will always proceed
    let currentJson = json.current;

    if (workspaces[currentJson.id]) {
        return;
    }

    let t = currentJson.name.split(':');

    let selectionId = t[0] === 9 ? 0 : t[0];
    let title = t[1];

    let current = {
        id: currentJson.id,
        selectionId: selectionId,
        originalName: currentJson.name,
        title: title,
        focused: currentJson.focused,
        monitor: currentJson.output,
        urgent: currentJson.urgent
    }

    workspaces[current.id] = current;

    sortWorkspaces();
}

function handleEmptyEvent (json) {
    // A focus event will always preceed this event.
    let id = json.current.id;

    delete workspaces[id];
    sortWorkspaces();
}

function sortWorkspaces () {
    let tmp = [];

    for (let workspaceId of Object.keys(workspaces)) {
        tmp.push(workspaces[workspaceId]);
    }

    workspaces = {};

    currentId = 0;

    tmp.sort((a, b) => { return a.originalName.localeCompare(b.originalName)});

    for (let workspace of tmp) {
        workspace.selectionId = currentId;
        currentId++;

        workspaces[workspace.id] = workspace;
    }
}

function handleUrgentEvent (json) {
    let current = json.current;

    if (workspaces[current.id]) {
        workspaces[current.id].urgent = current.urgent;
    } else {
        let t = currentJson.name.split(':');

        let selectionId = t[0] === 9 ? 0 : t[0];
        let title = t[1];

        let current = {
            id: currentJson.id,
            selectionId: selectionId,
            originalName: currentJson.name,
            title: title,
            focused: currentJson.focused,
            monitor: currentJson.output,
            urgent: currentJson.urgent
        }

        workspaces[current.id] = current;
    
        sortWorkspaces();
    }
}

function handleFocusEvent (json) {
    let oldJson = json.old;
    let currentJson = json.current;

    if (!workspaces[oldJson.id] || !workspaces[currentJson.id]) {
        return;
    }

    let old = workspaces[oldJson.id];
    let current = workspaces[currentJson.id];

    old.focused = false;
    old.urgent = oldJson.urgent;

    current.focused = true;
    current.urgent = currentJson.urgent;
}

function generateButtons () {
    let boxAttrs = ':orientation "h" :class "workspaces" :halign "start" :valign "center"'
    let buttons = '';

    let workspaceIds = Object.keys(workspaces);

    for (let workspaceId of workspaceIds) {        
        let workspace = workspaces[workspaceId];
        buttons += `(button :class "${workspace.focused ? 'active' : 'inactive'} ${workspace.urgent ? 'urgent' : ''} bordered" :onclick "wmctrl -s ${workspace.selectionId}" "${workspace.title}")`
    }

    let box = `(box ${boxAttrs} ${buttons})`;

    console.log(box);
    fs.writeFileSync('out', box);

}

fs.writeFileSync('out', 'TEST');
fetchWorkspaces();
fs.writeFileSync('out', JSON.stringify(workspaces));
generateButtons();
initiateSubscriber();