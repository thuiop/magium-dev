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

function scene_from_json(json_data,options={},full=false,id="") {
    let data = Object.assign({},json_data);
    data.text = ejs.render(data.text,options);
    data.header = get_header_from_id(data.id)
    console.log(Object.entries(data.responses[0].set_variables))
    console.log("Options", options)
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

function stats_page_from_cookies(cookies) {
    let rendered = ejs.renderFile("templates/stats.ejs",cookies)
    return rendered
}

let json_data = {}
for (chapter of ["ch1","ch2"]) {
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
  const id = "Ch1-Intro1"
  scene_from_json(json_data[id],req.cookies,true,id).then((rendered) => res.send(rendered))
})

// app.get('/stats', (req, res) => {
//     ejs.renderFile("templates/stats.ejs",req.cookies).then((rendered) => res.send(rendered))
// })

app.get('/menu', (req, res) => {
    ejs.renderFile("templates/menu.ejs",req.cookies).then((rendered) => res.send(rendered))
})

app.get('/scene/:id', (req, res) => {
  scene_from_json(json_data[req.params.id],req.cookies,req.params.id).then((rendered) => res.send(rendered))
})

app.get('/stats', (req, res) => {  
  stats_page_from_cookies(req.cookies).then((rendered) => res.send(rendered))
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

