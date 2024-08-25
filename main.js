let ejs = require('ejs');

function scene_from_json(json_path,options={},full=false) {
    let data = Object.assign({},require(json_path));
    data.text = ejs.render(data.text,options)
    console.log(Object.entries(data.responses[0].set_variables))
    console.log(options)
    let rendered =  ejs.renderFile("main.ejs",data)
    return rendered
}


const express = require('express')
var cookieParser = require('cookie-parser')
const app = express()
app.use(cookieParser())
const port = 3000

app.get('/', (req, res) => {
  scene_from_json("./chapters/ch1/ch1-intro1.json",req.cookies,true).then((rendered) => res.send(rendered))
})

app.get('/scene/:id', (req, res) => {
  scene_from_json("./chapters/ch1/"+req.params.id.toLowerCase()+".json",req.cookies).then((rendered) => res.send(rendered))
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
