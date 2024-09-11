const fs = require("node:fs");
const readline = require("readline");

function parseAssignement(assignement) {
    let matchAssignement = assignement.match(/(?<varName>\w*) = (?<value>.*)/);
    if (matchAssignement) {
        return [matchAssignement.groups.varName, matchAssignement.groups.value];
    } else {
        return;
    }
}

function parseConditions(conditionsString) {
    if (conditionsString) {
        conditionsString = conditionsString
            .replace("(", "")
            .replace(")", "")
            .split(" || ");
        return conditionsString.map((condString) => condString.split(" && "));
    }
}

async function parse(filename) {
    const fileStream = fs.createReadStream(filename);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    let scenes = [];
    let currentScene = {};
    let currentParagraph = { text: "", conditions: undefined };
    let skip = false;
    let match;
    for await (const line of rl) {
        if (line.startsWith("ID")) {
            if (currentScene) {
                scenes.push(currentScene);
            }
            currentScene = {
                id: line.split(": ")[1],
                paragraphs: [],
                statChecks: [],
                setVariables: [],
                choices: [],
            };
        } else if (line.startsWith("TEXT")) {
            skip = true; // There is a blank line after TEXT
        } else if (skip) {
            skip = false;
        } else if (
            (match = line.match(
                /set\((?<varName>.*),(?<value>[0-9])\)( if (?<condition>.*))?/,
            ))
        ) {
            const conditions = match.groups.condition
                ? parseConditions(match.groups.condition)
                : undefined;
            currentScene.setVariables.push({
                name: match.groups.varName,
                value: match.groups.value,
                conditions: conditions,
            });
        } else if (
            (match = line.match(
                /choice\("(?<text>.*)", (?<target>[\w\-\s]*), (?<setVariables>(\w* = [\w\-\s+]*(, )?)*)((, )?special:(?<special>.*?))?\)( if (?<condition>.*))?/,
            ))
        ) {
            if (currentParagraph.text != "") {
                currentScene.paragraphs.push(currentParagraph);
            }
            currentParagraph = { text: "", conditions: undefined };
            const setVariableList = match.groups.setVariables
                .split(", ")
                .map(parseAssignement);
            let setVariable = {};
            let setVar;
            for (setVar of setVariableList) {
                if (setVar) {
                    setVariable[setVar[0]] = setVar[1];
                }
            }
            const conditions = match.groups.condition
                ? parseConditions(match.groups.condition)
                : undefined;
            currentScene.choices.push({
                text: match.groups.text,
                target: match.groups.target,
                setVariables: setVariable,
                special: match.groups.special,
                conditions: conditions,
            });
        } else if ((match = line.match(/#if\((?<condition>.*)\)/))) {
            if (currentParagraph.text != "") {
                currentScene.paragraphs.push(currentParagraph);
            }
            const conditions = match.groups.condition
                ? parseConditions(match.groups.condition)
                : undefined;
            currentParagraph = { text: "", conditions: conditions };
        } else if (line.startsWith("}")) {
            currentScene.paragraphs.push(currentParagraph);
            currentParagraph = { text: "", conditions: undefined };
        } else {
            currentParagraph.text += line + "<br/>";
        }
    }
    if (currentParagraph.text != "") {
        currentScene.paragraphs.push(currentParagraph);
    }
    scenes.push(currentScene);
    let scenes_dict = {};
    scenes.slice(1).forEach((scene) => (scenes_dict[scene.id] = scene));
    return scenes_dict;
}

module.exports = {
    parse,
};
