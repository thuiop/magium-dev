let ejs = require('ejs');

function scene_from_json(json_data,options={},full=false) {
    let data = Object.assign({},json_data);
    data.text = ejs.render(data.text,options)
    console.log(Object.entries(data.responses[0].set_variables))
    console.log(options)
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

const path = require('path')
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  scene_from_json(json_data["Ch1-Intro1"],req.cookies,true).then((rendered) => res.send(rendered))
})

app.get('/scene/:id', (req, res) => {
  scene_from_json(json_data[req.params.id],req.cookies).then((rendered) => res.send(rendered))
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
