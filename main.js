let ejs = require('ejs');

/* Initial Logic to get the header from the id.
TODO: Discuss possibilities of alternate logic that do not need inference, 
  but can simply be stored in the JSON object itself.
*/
function get_header_from_id(id) {
    const id_parts = id.split("-")
    const book_regex = /B[0-9]*$/
    const chapter_regex = /Ch[0-9]*$/
    let book = "Book 1";
    let chapter = "Chapter 1";
    for (part of id_parts) {
        if (book_regex.test(part)) {
            book = part.replace("B","Book ")
        }
        else if (chapter_regex.test(part)) {
            chapter = part.replace("Ch","Chapter ")
        }
    }
    return `${book} - ${chapter}`
}

function render_full(req,callback,header=""){
    if (req.get("HX-Request")){
        return callback(req)
    }
    else {
        return callback(req).then((content) => ejs.renderFile("templates/outline.ejs",{"header": header,"content": content}))
    }
}

function render_scene(req,json_data,id) {
    let data = Object.assign({},json_data,{"id":id});
    data.text = ejs.render(data.text,req.cookies);
    return ejs.renderFile("templates/main.ejs",data)
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
    return ejs.renderFile("templates/stats.ejs",req.cookies)
}

function render_menu(req) {
    return ejs.renderFile("templates/menu.ejs",req.cookies)
}

let json_data = {}
for (chapter of ["ch1","ch2","ch3","ch4","ch5","ch6"]) {
    json_data = Object.assign(json_data,require(`./chapters/${chapter}.json`))
}

const express = require('express')
var cookieParser = require('cookie-parser')
const app = express()
app.use(cookieParser())
const port = 3000

// Serve static files
const path = require('path')
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    const id = req.cookies.v_current_scene ? req.cookies.v_current_scene : "Ch1-Intro1"
    render_full(req,(r) => render_scene(r,json_data[id],get_header_from_id(id)),get_header_from_id(id)).then((rendered) => res.send(rendered))
})

app.get('/menu', (req, res) => {
    render_full(req,render_menu,"Menu").then((rendered) => res.send(rendered))
})

app.get('/scene/:id', (req, res) => {
    render_full(req,(r) => render_scene(r,json_data[req.params.id]),get_header_from_id(req.params.id)).then((rendered) => res.send(rendered))
})

app.get('/stats', (req, res) => {  
    render_full(req,render_stats,"Stats").then((rendered) => res.send(rendered))
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

