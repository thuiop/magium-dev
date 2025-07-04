// setup.js
const ejs = require("ejs");
const path = require("path");

const parser = require("./parser.js");
const { globSync } = require('glob');

let port = process.env.PORT || 3000;
if (!isNaN(parseInt(process.argv[2]))) {
    port = parseInt(process.argv[2]);
}


const dirname = process.resourcesPath ? path.join(process.resourcesPath,"app") : process.cwd();
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
            /(?<varName>\w*) (?<condType><|>|>=|==|<=|!=) (?<value>[0-9])/,
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

function varToStat(varName) {
    if (varName == "v_agility") {
        return "Speed";
    }
    if (varName == "v_perception") {
        return "Observation";
    } else {
        return (
            varName.charAt(2).toUpperCase() + varName.slice(3).replace("_", " ")
        );
    }
}

function parseStatCheck(condition) {
    let match;
    if (
        (match = condition.match(
            /(?<varName>\w*) (?<condType><|>|>=|==|<=|!=) (?<value>[0-9])/,
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
    if (variable === "v_b3_ch1_unlock" && condType === "==" && value === 2){
        return { variable: variable, value: value, success: false}
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

function checkStats(setVariables, values) {
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
                        newStatChecks.push(JSON.stringify(statCheck));
                    }
                }
            }
        }
    }
    newStatChecks = [...new Set(newStatChecks)].map(JSON.parse);
    // If stat device locked, do not display other checks
    if (newStatChecks.some((statCheck)=>statCheck.variable == "v_b3_ch1_unlock")) {
        newStatChecks = newStatChecks.filter((statCheck)=>statCheck.variable == "v_b3_ch1_unlock")
    }
    return newStatChecks
}

/* Initial Logic to get the header from the id.
TODO: Discuss possibilities of alternate logic that do not need inference, 
  but can simply be stored in the JSON object itself.
*/
function get_header_from_id(id) {
    const regex = /(B(?<book>[0-9]*)-)?Ch(?<chapter>[0-9]*)[a-c]?-.*$/;
    let result = regex.exec(id)
    if (result) {
        let book = result.groups["book"] ? result.groups["book"] : "1";
        return `Book ${book} - Chapter ${result.groups["chapter"]}`;
    }
}

function getLocaleData(fullData,cookies) {
    let locale = cookies.locale ? cookies.locale : "en"
    return Object.assign({},fullData[locale])
}

function render_full(req, callback, header = "") {
    if (req.get("HX-Request")) {
        return callback(req);
    } else {
        return ejs.renderFile(path.join(dirname, "templates","outline.ejs"), Object.assign({
            header: header,
            path: req.path,
        },req.data));
    }
}

function render_scene(req) {
    const id = req.cookies.v_current_scene
        ? req.cookies.v_current_scene
        : "Ch1-Intro1";
    let cookieData = Object.assign({}, req.cookies);
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
    );
    console.log(sceneData.achievements);
    console.log(cookieData);
    sceneData.achievements = sceneData.achievements.filter(
        (achievement) => cookieData[achievement.variable] == "1" ,
    );
    console.log(sceneData.achievements);
    sceneData.checkpoint = sceneData.choices.some(
        (choice) => choice.setVariables["v_checkpoint_rich"] === "0",
    );
    let data = Object.assign({}, { id: id, header: get_header_from_id(id), scene: sceneData }, cookieData, req.data);
    return ejs.renderFile(path.join(dirname, "templates","main.ejs"), data);
}

function render_stats(req) {
    let data = Object.assign({}, req.data, {
        maximized:
            req.cookies.v_current_scene === "Ch6-Eiden-vs-dragon" &&
            req.cookies.v_maximized_stats_used === "1",
    }, req.cookies);
    return ejs.renderFile(path.join(dirname, "templates","stats.ejs"), data);
}

function render_menu(req) {
    return ejs.renderFile(
        path.join(dirname, "templates","menu.ejs"),
        req.data,
    );
}


function render_settings(req) {
    return ejs.renderFile(
        path.join(dirname, "templates","settings.ejs"),
        req.data,
    );
}

function render_language(req,locales) {
    return ejs.renderFile(
        path.join(dirname, "templates","language.ejs"),
        Object.assign({},req.data,{"locales":locales}),
    );
}

function render_achievements_menu(req) {
    return ejs.renderFile(
        path.join(dirname, "templates","achievements_menu.ejs"),
        Object.assign({},req.data,req.cookies),
    );
}

function render_achievements_menu_book(req, achievementsData) {
    return ejs.renderFile(
        path.join(dirname, "templates","achievements_menu_book.ejs"),
        Object.assign({}, req.data, { achievements: achievementsData }),
    );
}

function render_achievements_menu_chapter(req, achievementsData) {
    return ejs.renderFile(
        path.join(dirname, "templates","achievements_menu_chapter.ejs"),
        Object.assign({}, { achievements: achievementsData }, req.cookies, req.data),
    );
}

function render_saves(req) {
    let saveData = {};
    Object.entries(req.body).forEach(function (entry) {
        saveData[entry[0]] = { date: entry[1].date, name: entry[1].name };
    });
    let data = Object.assign({}, req.cookies, { saveData: saveData }, req.data);
    return ejs.renderFile(path.join(dirname, "templates","saves.ejs"), data);
}

// For now, it is the same as render_saves
// However, it is expected to be different in the future
function render_local_saves(req) {
    let saveData = {} 
    Object.entries(req.body).forEach(function(entry){
        saveData[entry[0]] = {"date": entry[1].date, "name": entry[1].name}
    })
    let data = Object.assign({},req.cookies, {"saveData":saveData}, req.data)
    return ejs.renderFile(path.join(dirname,"templates","local_saves.ejs"),data)
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
        saveData[entry[0]] = { date: entry[1].date, name: entry[1].name };
    });
    let data = Object.assign({}, req.cookies, {
        saveData: saveData,
        page: parseInt(page),
    }, req.data);
    return ejs.renderFile(path.join(dirname, "templates","saves.ejs"), data);
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
        Object.assign({},req.cookies,req.data),
    );
}

/// ---

console.log(dirname,)
let locales = require(path.join(dirname, "data", "locales.json"))
let localeData = {};
let magiumData = {};
let achievementsData = {};
let chapter;
let book;

Object.keys(locales).forEach( function(locale) {
    magiumData[locale] = {}
    const chapterFiles = globSync(path.join(dirname,"data",locale,"*.magium").replace(/\\/g,'/'))
    for (chapterFile of chapterFiles) {
        parser
            .parse(chapterFile)
            .then((val) => Object.assign(magiumData[locale], val));
    }

    achievementsData[locale] = {}
    for (book of [1, 2, 3]) {
        achievementsData[locale][book] = require(
            path.join(dirname, "data",locale,`achievements${book}.json`),
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
  req.data = Object.assign({},getLocaleData(magiumData,req.cookies),getLocaleData(localeData,req.cookies));
  next()
})


expressApp.get("/", (req, res) => {
    const id = req.cookies.v_current_scene
        ? req.cookies.v_current_scene
        : "Ch1-Intro1";
    render_full(
        req,
        (r) => render_scene(r),
        get_header_from_id(id),
    ).then((rendered) => res.send(rendered));
});

expressApp.get("/menu", (req, res) => {
    render_full(req, render_menu, "Menu").then((rendered) =>
        res.send(rendered),
    );
});

expressApp.get("/settings", (req, res) => {
    render_full(req, render_settings, "Settings").then((rendered) =>
        res.send(rendered),
    );
});


expressApp.get("/language", (req, res) => {
    render_full(req, (req) => (render_language(req,locales)), "Language selection").then((rendered) =>
        res.send(rendered),
    );
});


expressApp.get("/stats", (req, res) => {
    render_full(req, render_stats, "Stats").then((rendered) =>
        res.send(rendered),
    );
});

expressApp.get("/achievements", (req, res) => {
    render_full(req, render_achievements_menu, "Achievements").then(
        (rendered) => res.send(rendered),
    );
});

expressApp.get("/achievements/book/:id", (req, res) => {
    const data  = getLocaleData(achievementsData,req.cookies);
    const callback = (r) =>
        render_achievements_menu_book(
            r,
            data[parseInt(r.params.id)],
        );
    render_full(req, callback, "Achievements").then((rendered) =>
        res.send(rendered),
    );
});

expressApp.get(
    "/achievements/book/(:idBook)/chapter/(:idChapter)",
    (req, res) => {
        const data  = getLocaleData(achievementsData,req.cookies);
        const callback = (r) =>
            render_achievements_menu_chapter(
                r,
                data[parseInt(r.params.idBook)][
                    `b${r.params.idBook}ch${r.params.idChapter}`
                ],
            );
        render_full(req, callback, "Achievements").then((rendered) =>
            res.send(rendered),
        );
    },
);

expressApp.all("/saves", bodyParser.json(), (req, res) => {
    render_full(req, render_saves, "Save files").then((rendered) =>
        res.send(rendered),
    );
});

expressApp.all("/saves/:page", bodyParser.json(), (req, res) => {
    const callback = (r) => render_saves_by_page(r, req.params.page);
    render_full(req, callback, "Save files").then((rendered) =>
        res.send(rendered),
    );
});

expressApp.all('/local_saves', bodyParser.json(), (req, res) => {  
    render_full(req,render_local_saves,"Local Save files").then((rendered) => res.send(rendered));
});

expressApp.all('/local_saves/:page', bodyParser.json(), (req, res) => {  
    const callback = (r) => render_local_saves_by_page(r, req.params.page);
    render_full(req, callback, "Local Save files").then((rendered) => 
        res.send(rendered)
    );
});

expressApp.get("/about", (req, res) => {
    render_full(req, render_about, "About").then(
        (rendered) => res.send(rendered),
    );
});

expressApp.listen(port, () => {
    console.log(`Magium listening on port ${port}`);
});

module.exports = {
    port,
    expressApp,
};
