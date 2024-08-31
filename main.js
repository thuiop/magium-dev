let ejs = require('ejs');
const path = require('path')


if (!isNaN(parseInt(process.argv[2]))) {
    port = parseInt(process.argv[2]);
}

console.log(port)

const { app, BrowserWindow } = require('electron');
app.on('ready', function() {
  let mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: true
    },
    autoHideMenuBar: true,
    useContentSize: true,
    resizable: true,
  });
  mainWindow.loadURL(`http://localhost:${port}/`);
  mainWindow.focus();
});
/* Initial Logic to get the header from the id.
TODO: Discuss possibilities of alternate logic that do not need inference, 
  but can simply be stored in the JSON object itself.
*/
function get_header_from_id(id) {
    const regex = /(B(?<book>[0-9]*)-)?Ch(?<chapter>[0-9]*)[a-c]?-.*$/
    if (result=regex.exec(id)) {
        let book = result.groups["book"] ? result.groups["book"] : "1"
        return `Book ${book} - Chapter ${result.groups["chapter"]}`
    }
}

function render_full(req,callback,header=""){
    if (req.get("HX-Request")){
        return callback(req)
    }
    else {
        return ejs.renderFile(path.join(__dirname,"templates/outline.ejs"),{"header": header,"path": req.path})
    }
}

function render_scene(req,json_data,id) {
    let data = Object.assign({},json_data,{"id":id},req.cookies);
    data.text = ejs.render(data.text,req.cookies);
    return ejs.renderFile(path.join(__dirname,"templates/main.ejs"),data)
}

// Temporary array to keep track of stats variables
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
  "v_max_stat"
]

function render_stats(req) {
    return ejs.renderFile(path.join(__dirname,"templates/stats.ejs"),req.cookies)
}

function render_menu(req) {
    return ejs.renderFile(path.join(__dirname,"templates/menu.ejs"),req.cookies)
}

function render_achievements_menu(req) {
    return ejs.renderFile(path.join(__dirname,"templates/achievements_menu.ejs"),req.cookies)
}

function render_achievements_menu_book(req,achievements_data) {
    return ejs.renderFile(path.join(__dirname,"templates/achievements_menu_book.ejs"),{"achievements":achievements_data})
}

function render_achievements_menu_chapter(req,achievements_data) {
    return ejs.renderFile(path.join(__dirname,"templates/achievements_menu_chapter.ejs"),Object.assign({},{"achievements":achievements_data},req.cookies))
}


function render_saves(req) {
    let saveData = {} 
    Object.entries(req.body).forEach(function(entry){
        saveData[entry[0]] = {"date": entry[1].date, "name": entry[1].name}
    })
    let data = Object.assign({},req.cookies, {"saveData":saveData})
    return ejs.renderFile(path.join(__dirname,"templates/saves.ejs"),data)
}

let json_data = {}
const chapters = (
    ["ch1","ch2","ch3","ch4","ch5","ch6","ch7","ch8","ch9","ch10","ch11a","ch11b",
    'b2ch1', 'b2ch2', 'b2ch3', 'b2ch4a', 'b2ch4b', 'b2ch5a', 'b2ch5b', 'b2ch6', 'b2ch7','b2ch8', 'b2ch9a', 'b2ch9b', 'b2ch10a', 'b2ch10b', 'b2ch11a', 'b2ch11b', 'b2ch11c',
    'b3ch1', 'b3ch2a', 'b3ch2b', 'b3ch2c', 'b3ch3a', 'b3ch3b', 'b3ch4a', 'b3ch4b', 'b3ch5a', 'b3ch5b', 'b3ch6a', 'b3ch6b', 'b3ch6c', 'b3ch7a', 'b3ch8a', 'b3ch8b', 'b3ch9a', 'b3ch9b', 'b3ch9c', 'b3ch10a', 'b3ch10b', 'b3ch10c', 'b3ch11a', 'b3ch12a', 'b3ch12b']
)
for (chapter of chapters) {
    json_data = Object.assign(json_data,require(path.join(__dirname,`chapters/${chapter}.json`)))
}

let achievements_data = {}
for (book of [1,2,3]) {
    achievements_data[book] = require(path.join(__dirname,`chapters/achievements${book}.json`))
}


const express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const expressApp = express();
expressApp.use(cookieParser());

// Serve static files
expressApp.use(express.static(path.join(__dirname, 'public')));

expressApp.get('/', (req, res) => {
    const id = req.cookies.v_current_scene ? req.cookies.v_current_scene : "Ch1-Intro1"
    render_full(req,(r) => render_scene(r,json_data[id],get_header_from_id(id)),get_header_from_id(id)).then((rendered) => res.send(rendered))
})

expressApp.get('/menu', (req, res) => {
    render_full(req,render_menu,"Menu").then((rendered) => res.send(rendered))
})

expressApp.get('/scene/:id', (req, res) => {
    const callback = (r) => render_scene(r,json_data[req.params.id],get_header_from_id(req.params.id));
    render_full(req,callback,get_header_from_id(req.params.id)).then((rendered) => res.send(rendered));
})

expressApp.get('/stats', (req, res) => {  
    render_full(req,render_stats,"Stats").then((rendered) => res.send(rendered));
})


expressApp.get('/achievements', (req, res) => {  
    render_full(req,render_achievements_menu,"Achievements").then((rendered) => res.send(rendered));
})

expressApp.get('/achievements/book/:id', (req, res) => {
    const callback = (r) => render_achievements_menu_book(r,achievements_data[parseInt(r.params.id)]);
    render_full(req,callback,"Achievements").then((rendered) => res.send(rendered));
})


expressApp.get('/achievements/book/(:idBook)/chapter/(:idChapter)', (req, res) => {
    const callback = (r) => render_achievements_menu_chapter(r,achievements_data[parseInt(r.params.idBook)][`b${r.params.idBook}ch${r.params.idChapter}`]);
    render_full(req,callback,"Achievements").then((rendered) => res.send(rendered))
})

expressApp.all('/saves', bodyParser.json(), (req, res) => {  
    render_full(req,render_saves,"Save files").then((rendered) => res.send(rendered));
})

expressApp.listen(port, () => {
    console.log(`Magium listening on port ${port}`)
})

