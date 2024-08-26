let ejs = require('ejs');

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
    let rendered =  ejs.renderFile("main.ejs",data)
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

app.get('/scene/:id', (req, res) => {
  scene_from_json(json_data[req.params.id],req.cookies,req.params.id).then((rendered) => res.send(rendered))
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
