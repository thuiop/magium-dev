// setup.js
const path = require("path");
const express = require("express");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");

const parser = require("./parser.js");
const { getLocaleData, getHeaderFromId } = require("./utils.js");
const { 
    renderAbout,
    renderAchievementsMenu,
    renderAchievementsMenuBook,
    renderAchievementsMenuChapter,
    renderLanguage,
    renderMenu,
    renderScene,
    renderSettings,
    renderStats,
    renderSaves,
    renderSavesByPage,
    renderThenSend,
} = require("./renderers.js")
const { globSync } = require('glob');

let port = process.env.PORT || 3000;
if (!isNaN(parseInt(process.argv[2]))) {
    port = parseInt(process.argv[2]);
}


const dirName = process.resourcesPath ? path.join(process.resourcesPath, "app") : process.cwd();


let locales = require(path.join(dirName, "data", "locales.json"))
let localeData = {};
let magiumData = {};
let achievementsData = {};
let book;

// Load data from files
Object.keys(locales).forEach(function (locale) {
    const localeDirName = path.join(dirName, "data", locale);
    magiumData[locale] = {}
    const chapterFiles = globSync(path.join(localeDirName, "*.magium").replace(/\\/g, '/'))
    let chapterFile;
    for (chapterFile of chapterFiles) {
        parser
            .parse(chapterFile)
            .then((val) => Object.assign(magiumData[locale], val));
    }

    achievementsData[locale] = {}
    for (book of [1, 2, 3]) {
        achievementsData[locale][book] = require(
            path.join(localeDirName, `achievements${book}.json`),
        );
    }

    localeData[locale] = require(
        path.join(localeDirName, "ui.json"),
    );
});

const expressApp = express();
expressApp.use(cookieParser());

// Serve static files
expressApp.use(express.static(path.join(dirName, "public")));

// Retrieve the correct locale data
expressApp.use((req, _, next) => {
    req.data = Object.assign(
        {},
        getLocaleData(localeData, req.cookies.locale),
        getLocaleData(magiumData, req.cookies.locale),
        { achievements: getLocaleData(achievementsData, req.cookies.locale) },
    );
    next()
})

expressApp.all("/", bodyParser.json(), (req, res) => {
    const id = req.body.v_current_scene
        ? req.body.v_current_scene
        : "Ch1-Intro1";
    const header = getHeaderFromId(id, req.data["mainHeaderTemplate"]);
    renderThenSend(renderScene, header)(req, res);
});

expressApp.get("/menu", renderThenSend(renderMenu, "menuHeaderText"));
expressApp.get("/language", renderThenSend((req) => renderLanguage(req, locales), "languageHeaderText"));
expressApp.get("/about", renderThenSend(renderAbout, "aboutHeaderText"));
expressApp.get("/achievements", renderThenSend(renderAchievementsMenu, "achievementsMenuHeaderText"));
expressApp.get("/achievements/book/:id", renderThenSend(renderAchievementsMenuBook, "achievementsMenuHeaderText"));

expressApp.all("/achievements/book/:idBook/chapter/:idChapter", renderThenSend(renderAchievementsMenuChapter, "achievementsMenuHeaderText"));
expressApp.all("/stats", bodyParser.json(), renderThenSend(renderStats, "statsHeaderText"));
expressApp.all("/settings", bodyParser.json(), renderThenSend(renderSettings, "settingsHeaderText"));
expressApp.all("/saves", bodyParser.json({ limit: '200mb' }), renderThenSend(renderSaves, "savesHeaderText"));
expressApp.all("/saves/:page", bodyParser.json({ limit: '200mb' }), renderThenSend((req) => renderSavesByPage(req, req.params.page), "savesHeaderText"));


expressApp.listen(port, () => {
    console.log(`Magium listening on port ${port}`);
});

module.exports = {
    port,
    expressApp,
};
