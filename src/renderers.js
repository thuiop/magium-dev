const ejs = require("ejs");
const { 
    getHeaderFromId,
    apply_conditions,
    checkStats,
} = require("./utils.js");
const path = require("path");

const dirName = process.resourcesPath ? path.join(process.resourcesPath, "app") : process.cwd();
const templateDirName = path.join(dirName, "templates");

function renderFull(req, callback, header = "") {
    if (req.get("HX-Request")) {
        return callback(req);
    } else {
        return ejs.renderFile(path.join(templateDirName, "outline.ejs"), Object.assign({
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
    let data = Object.assign({}, { id: id, header: getHeaderFromId(id, req.data["mainHeaderTemplate"]), scene: sceneData, "ejs": ejs }, cookieData, req.data);
    return ejs.renderFile(path.join(templateDirName, "main.ejs"), data);
}

function renderStats(req) {
    let data = Object.assign({}, req.data, {
        "maximized":
            (req.body.v_current_scene || "") === "Ch6-Eiden-vs-dragon" &&
            (req.body.v_maximized_stats_used || 0) === "1",
        "stats_intro_seen": req.cookies.stats_intro_seen,
        "ejs": ejs,
    }, req.body);
    return ejs.renderFile(path.join(templateDirName, "stats.ejs"), data);
}

function renderMenu(req) {
    return ejs.renderFile(
        path.join(templateDirName, "menu.ejs"),
        req.data,
    );
}


function renderSettings(req) {
    return ejs.renderFile(
        path.join(templateDirName, "settings.ejs"),
        Object.assign({}, req.body, req.data),
    );
}

function renderLanguage(req, locales) {
    return ejs.renderFile(
        path.join(templateDirName, "language.ejs"),
        Object.assign({}, req.data, { "locales": locales }),
    );
}

function renderAchievementsMenu(req) {
    const bookCount = Object.keys(req.data.achievements).length;
    return ejs.renderFile(
        path.join(templateDirName, "achievements_menu.ejs"),
        Object.assign({}, req.data, req.body, { "ejs": ejs, "bookCount": bookCount }),
    );
}

function renderAchievementsMenuBook(req) {
    const achievementsData = req.data.achievements[parseInt(req.params.id)];
    return ejs.renderFile(
        path.join(templateDirName, "achievements_menu_book.ejs"),
        Object.assign({}, req.data, { achievements: achievementsData, ejs: ejs }),
    );
}

function renderAchievementsMenuChapter(req) {
    const achievementsData = req.data.achievements[parseInt(req.params.idBook)][`b${req.params.idBook}ch${req.params.idChapter}`];
    return ejs.renderFile(
        path.join(templateDirName, "achievements_menu_chapter.ejs"),
        Object.assign({}, req.body, req.data, { achievements: achievementsData }),
    );
}

function renderSaves(req) {
    let saveData = {};
    Object.entries(req.body).forEach(function (entry) {
        saveData[entry[0]] = { date: entry[1].date, name: entry[1].name };
    });
    let data = Object.assign({}, req.cookies, { saveData: saveData }, req.data);
    return ejs.renderFile(path.join(templateDirName, "saves.ejs"), data);
}

function renderSavesByPage(req, page) {
    let saveData = {};
    Object.entries(req.body).forEach(function (entry) {
        if (entry[1]) {
            saveData[entry[0]] = { date: entry[1].date, name: entry[1].name };
        }
    });
    let data = Object.assign({}, req.cookies, {
        saveData: saveData,
        page: parseInt(page),
    }, req.data);
    return ejs.renderFile(path.join(templateDirName, "saves.ejs"), data);
}

function renderAbout(req) {
    return ejs.renderFile(
        path.join(templateDirName, "about.ejs"),
        Object.assign({}, req.cookies, req.data),
    );
}

module.exports = {
    renderAbout,
    renderAchievementsMenu,
    renderAchievementsMenuBook,
    renderAchievementsMenuChapter,
    renderFull,
    renderLanguage,
    renderMenu,
    renderScene,
    renderSettings,
    renderStats,
    renderSaves,
    renderSavesByPage,
    renderThenSend,
}
