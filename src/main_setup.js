// setup.js
const ejs = require("ejs");
const path = require("path");

const parser = require("./parser.js");
const { globSync } = require('glob');

let port = process.env.PORT || 3000;
if (!isNaN(parseInt(process.argv[2]))) {
    port = parseInt(process.argv[2]);
}


const dirname = process.resourcesPath ? path.join(process.resourcesPath, "app") : process.cwd();
const stats_variables = [
    "v_available_points",
    "v_strength",
    "v_toughness",
    "v_agility", // Speed
    "v_reflexes",
    "v_hearing",
    "v_perception", // Observation
    "v_ancient_languages",
    "v_combat_technique",
    "v_premonition",
    "v_bluff",
    "v_magical_sense",
    "v_aura_hardening",
    "v_magical_power", // Currently, not utilized
    "v_magical_knowledge", // Currently, not utilized
    "v_max_stat",
];

/// ---

function apply_condition(entry, values) {
    if (!entry) {
        return true;
    }
    let match;
    if (entry == "True") {
        return true;
    } else if (
        (match = entry.match(
            /(?<varName>\w*) (?<condType><|>|>=|==|<=|!=) (?<value>[0-9]+)/,
        ))
    ) {
        var variable = match.groups.varName;
        var condType = match.groups.condType;
        var value = parseInt(match.groups.value);
    } else {
        console.log("Condition fail");
        console.log(entry);
        return;
    }
    if (condType == ">") {
        return (values[variable] || 0) > value;
    } else if (condType == "<") {
        return (values[variable] || 0) < value;
    } else if (condType == "<=") {
        return (values[variable] || 0) <= value;
    } else if (condType == ">=") {
        return (values[variable] || 0) >= value;
    } else if (condType == "!=") {
        return (values[variable] || 0) != value;
    } else if (condType == "==") {
        return (values[variable] || 0) == value;
    }
}

function apply_conditions(conditions, values) {
    return (
        !conditions ||
        conditions.some((conds) =>
            conds.every((cond) => apply_condition(cond, values)),
        )
    );
}

function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}


function varToStat(varName) {
    let statName;
    if (varName == "v_agility") {
        statName = "Speed";
    }
    else if (varName == "v_perception") {
        statName = "Observation";
    } else {
        statName = (
            varName.slice(2).split("_").map(capitalizeFirstLetter).join("")
        );
    }
    return "stats" + statName + "Text";
}

function parseStatCheck(condition) {
    let match;
    if (
        (match = condition.match(
            /(?<varName>\w*) (?<condType><|>|>=|==|<=|!=) (?<value>[0-9]+)/,
        ))
    ) {
        var variable = match.groups.varName;
        var condType = match.groups.condType;
        var value = parseInt(match.groups.value);
    } else {
        console.log("Stat check parsing fail");
        console.log(condition);
        return;
    }
    // Handle the case where you lock your stat device at the beginning of book 3
    if (variable === "v_b3_ch1_unlock" && condType === "==" && value === 2) {
        return { variable: variable, value: value, success: false }
    }
    if (!stats_variables.includes(variable)) {
        return;
    }

    let success;
    if (condType == "<") {
        success = false;
    } else if (condType == "==" && value == 0) {
        success = false;
        value = 1;
    } else if (condType == ">=" || (condType == "==" && value != 0)) {
        success = true;
    } else if (condType == ">") {
        success = true;
        value += 1;
    } else {
        console.log("Unmatched condition type", condType);
    }
    return { variable: varToStat(variable), value: value, success: success };
}

function checkStats(setVariables, values, localeData) {
    let newStatChecks = [];
    let setVariable;
    for (setVariable of setVariables) {
        if (!setVariable.conditions) {
            continue;
        } else {
            let conditionGroups = setVariable.conditions.filter((conds) =>
                conds.every((cond) => apply_condition(cond, values)),
            );
            let conditionGroup, condition, statCheck;
            for (conditionGroup of conditionGroups) {
                for (condition of conditionGroup) {
                    if ((statCheck = parseStatCheck(condition))) {
                        statCheck.variable = statCheck.variable == "v_b3_ch1_unlock" ? statCheck.variable : localeData[statCheck.variable];
                        newStatChecks.push(JSON.stringify(statCheck));
                    }
                }
            }
        }
    }
    newStatChecks = [...new Set(newStatChecks)].map(JSON.parse);
    // If stat device locked, do not display other checks
    if (newStatChecks.some((statCheck) => statCheck.variable == "v_b3_ch1_unlock")) {
        newStatChecks = newStatChecks.filter((statCheck) => statCheck.variable == "v_b3_ch1_unlock")
    }
    return newStatChecks
}

/* Initial Logic to get the header from the id.
TODO: Discuss possibilities of alternate logic that do not need inference, 
  but can simply be stored in the JSON object itself.
*/
function get_header_from_id(id, headerTemplate) {
    const regex = /(B(?<book>[0-9]*)-)?Ch(?<chapter>[0-9]*)[a-c]?-.*$/;
    let result = regex.exec(id)
    if (result) {
        let book = result.groups["book"] ? result.groups["book"] : "1";
        let chapter = parseInt(result.groups["chapter"]);
        return ejs.render(headerTemplate, { "book": book, "chapter": chapter })
    }
}

function getLocaleData(fullData, localeCookie) {
    let locale = localeCookie ? localeCookie : "en"
    return Object.assign({}, fullData[locale])
}

function getLocaleDataValue(fullData, localeCookie, key) {
    let locale = localeCookie ? localeCookie : "en"
    return fullData[locale][key]
}

function renderFull(req, callback, header = "") {
    if (req.get("HX-Request")) {
        return callback(req);
    } else {
        return ejs.renderFile(path.join(dirname, "templates", "outline.ejs"), Object.assign({
            header: header,
            path: req.path,
        }, req.data));
    }
}

function renderThenSend(callback, headerKey) {
    return (req, res) => renderFull(req, callback, req.data[headerKey]).then(
        (rendered) => res.send(rendered),
    );
}

function renderScene(req) {
    const id = req.body.v_current_scene
        ? req.body.v_current_scene
        : "Ch1-Intro1";
    let cookieData = Object.assign({}, req.body);
    let sceneData = Object.assign({}, req.data[id]);
    sceneData.setVariables = sceneData.setVariables.filter((setVariable) =>
        apply_conditions(setVariable.conditions, cookieData),
    );
    sceneData.setVariables.forEach(
        (setVariable) => (cookieData[setVariable.name] = setVariable.value),
    );
    sceneData.choices = sceneData.choices.filter(
        (choice) => apply_conditions(choice.conditions, cookieData),
    );
    sceneData.paragraphs = sceneData.paragraphs.filter(
        (paragraph) => apply_conditions(paragraph.conditions, cookieData),
    );
    sceneData.statChecks = checkStats(
        sceneData.setVariables.concat(sceneData.paragraphs, sceneData.choices),
        cookieData,
        req.data,
    );
    sceneData.achievements = sceneData.achievements.filter(
        (achievement) => cookieData[achievement.variable] === "1"
    );
    // This achievement can show up in any scene
    if (cookieData["v_ac_b3_ch9_prize"] == "1") {
        sceneData.achievements.push({ "text": "Consolation prize", "variable": "v_ac_b3_ch9_prize" })
    }
    sceneData.checkpoint = sceneData.choices.some(
        (choice) => choice.setVariables["v_checkpoint_rich"] === "0",
    );
    let data = Object.assign({}, { id: id, header: get_header_from_id(id, req.data["mainHeaderTemplate"]), scene: sceneData, "ejs": ejs }, cookieData, req.data);
    return ejs.renderFile(path.join(dirname, "templates", "main.ejs"), data);
}

function render_stats(req) {
    let data = Object.assign({}, req.data, {
        "maximized":
            (req.body.v_current_scene || "") === "Ch6-Eiden-vs-dragon" &&
            (req.body.v_maximized_stats_used || 0) === "1",
        "stats_intro_seen": req.cookies.stats_intro_seen,
        "ejs": ejs,
    }, req.body);
    return ejs.renderFile(path.join(dirname, "templates", "stats.ejs"), data);
}

function render_menu(req) {
    return ejs.renderFile(
        path.join(dirname, "templates", "menu.ejs"),
        req.data,
    );
}


function render_settings(req) {
    return ejs.renderFile(
        path.join(dirname, "templates", "settings.ejs"),
        Object.assign({}, req.body, req.data),
    );
}

function render_language(req, locales) {
    return ejs.renderFile(
        path.join(dirname, "templates", "language.ejs"),
        Object.assign({}, req.data, { "locales": locales }),
    );
}

function render_achievements_menu(req) {
    const bookCount = Object.keys(achievementsData["en"]).length;
    return ejs.renderFile(
        path.join(dirname, "templates", "achievements_menu.ejs"),
        Object.assign({}, req.data, req.body, { "ejs": ejs, "bookCount": bookCount }),
    );
}

function render_achievements_menu_book(req) {
    const localAchievementsData = getLocaleDataValue(achievementsData,req.cookies.locale,parseInt(req.params.id));
    return ejs.renderFile(
        path.join(dirname, "templates", "achievements_menu_book.ejs"),
        Object.assign({}, req.data, { achievements: localAchievementsData, ejs: ejs }),
    );
}

function render_achievements_menu_chapter(req) {
    const localAchievementsData = getLocaleDataValue(achievementsData,req.cookies.locale,parseInt(req.params.idBook))[`b${req.params.idBook}ch${req.params.idChapter}`];
    return ejs.renderFile(
        path.join(dirname, "templates", "achievements_menu_chapter.ejs"),
        Object.assign({}, { achievements: localAchievementsData }, req.body, req.data),
    );
}

function render_saves(req) {
    let saveData = {};
    Object.entries(req.body).forEach(function (entry) {
        saveData[entry[0]] = { date: entry[1].date, name: entry[1].name };
    });
    let data = Object.assign({}, req.cookies, { saveData: saveData }, req.data);
    return ejs.renderFile(path.join(dirname, "templates", "saves.ejs"), data);
}

// While this is not the best way to handle pagination-based requests,
// because this way there is hard-coding in both the frontend and the backend,
// it is a simplest way to handle it.
// TODO: Discuss better ways to handle pagination if needed.
function render_saves_by_page(req, page) {
    //const savesLength = Object.keys(req.body).length;
    //const pageLength = 10;

    /**
     * In the current setup, the frontend uses the name of the save
     * as the key for the save data. This means that filtering out the
     * saves based on the page number does not make a difference.
     * However, this code is kept here for future reference.
     * If the frontend instead starts accessing the save data based on an index,
     * then this code will be useful.
     */
    let saveData = {};
    // let index = 0;
    // let first = page * pageLength;
    // let last = first + pageLength;
    // if ((first >= 0) && (first < savesLength)) {
    //     for (let i = first; i < last; i++) {
    //         if (req.body[i]) {
    //             entry = req.body[i]
    //             saveData[entry[0]] = {"date": entry[1].date, "name": entry[1].name}
    //         }
    //     }
    // }
    Object.entries(req.body).forEach(function (entry) {
        if (entry[1]) {
            saveData[entry[0]] = { date: entry[1].date, name: entry[1].name };
        }
    });
    let data = Object.assign({}, req.cookies, {
        saveData: saveData,
        page: parseInt(page),
    }, req.data);
    return ejs.renderFile(path.join(dirname, "templates", "saves.ejs"), data);
}

// Similar logic to render_saves_by_page
function render_local_saves_by_page(req, page) {
    let saveData = {};
    Object.entries(req.body).forEach(function (entry) {
        saveData[entry[0]] = { date: entry[1].date, name: entry[1].name };
    });
    let data = Object.assign({}, req.cookies, {
        saveData: saveData,
        page: parseInt(page),
    }, req.data);
    return ejs.renderFile(path.join(dirname, "templates", "local_saves.ejs"), data);
}


function render_about(req) {
    return ejs.renderFile(
        path.join(dirname, "templates", "about.ejs"),
        Object.assign({}, req.cookies, req.data),
    );
}

/// ---

let locales = require(path.join(dirname, "data", "locales.json"))
let localeData = {};
let magiumData = {};
let achievementsData = {};
let book;

Object.keys(locales).forEach(function (locale) {
    magiumData[locale] = {}
    const chapterFiles = globSync(path.join(dirname, "data", locale, "*.magium").replace(/\\/g, '/'))
    let chapterFile;
    for (chapterFile of chapterFiles) {
        parser
            .parse(chapterFile)
            .then((val) => Object.assign(magiumData[locale], val));
    }

    achievementsData[locale] = {}
    for (book of [1, 2, 3]) {
        achievementsData[locale][book] = require(
            path.join(dirname, "data", locale, `achievements${book}.json`),
        );
    }

    localeData[locale] = require(
        path.join(dirname, "data", locale, "ui.json"),
    );
});

const express = require("express");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
const expressApp = express();
expressApp.use(cookieParser());

// Serve static files
expressApp.use(express.static(path.join(dirname, "public")));

expressApp.use((req, res, next) => {
    req.data = Object.assign({}, getLocaleData(magiumData, req.cookies.locale), getLocaleData(localeData, req.cookies.locale));
    next()
})

expressApp.all("/", bodyParser.json(), (req, res) => {
    const id = req.body.v_current_scene
        ? req.body.v_current_scene
        : "Ch1-Intro1";
    renderFull(
        req,
        (req) => renderScene(req),
        get_header_from_id(id, req.data["mainHeaderTemplate"]),
    ).then((rendered) => res.send(rendered));
});

expressApp.get("/menu", renderThenSend(render_menu, "menuHeaderText"));
expressApp.get("/language", renderThenSend((req) => render_language(req, locales),"languageHeaderText"));
expressApp.get("/about", renderThenSend(render_about, "aboutHeaderText"));
expressApp.get("/achievements", renderThenSend(render_achievements_menu, "achievementsMenuHeaderText"));
expressApp.get("/achievements/book/:id", renderThenSend(render_achievements_menu_book, "achievementsMenuHeaderText"));

expressApp.all("/achievements/book/:idBook/chapter/:idChapter", renderThenSend(render_achievements_menu_chapter, "achievementsMenuHeaderText"));
expressApp.all("/stats", bodyParser.json(), renderThenSend(render_stats, "statsHeaderText"));
expressApp.all("/settings", bodyParser.json(), renderThenSend(render_settings, "settingsHeaderText"));
expressApp.all("/saves", bodyParser.json({ limit: '200mb' }), renderThenSend(render_saves,"savesHeaderText"));
expressApp.all("/saves/:page", bodyParser.json({ limit: '200mb' }), renderThenSend((req) => render_saves_by_page(req, req.params.page),"savesHeaderText"));


expressApp.listen(port, () => {
    console.log(`Magium listening on port ${port}`);
});

module.exports = {
    port,
    expressApp,
};
