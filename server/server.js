import express from "express";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql"
import expressWs from 'express-ws';




const port = 3001;

const app = expressWs(express()).app
const expressws = expressWs(app)

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'jeopardy'
  })




const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


app.use(cookieParser())
app.use(express.urlencoded({ extended: true })); 

app.get('/buzzer',(req,res)=>{
    if(!req.cookies.user_token){
        res.redirect('/login')
       
    }
    else{
        res.sendFile(path.join(__dirname, "views", "buzzer.html"));
    }
   
})

app.get('/login',(req,res)=>{
    res.sendFile(path.join(__dirname, "views", "login.html"));
})

app.get('/admin',(req,res)=>{
    res.sendFile(path.join(__dirname, "views", "admin.html"));
})

app.post('/login',(req,res)=>{
    console.log(req.body)
    if(req.body.username){
        const name = req.body.username
        const token =  crypto.randomBytes(32).toString('hex')
        res.cookie("user_token", token, {
            maxAge: 1000 * 60 * 60 * 24 * 2, // 1 year
            httpOnly: true,
            sameSite: "Lax",
        });
        connection.connect();
        connection.query("INSERT INTO users (token, name, points) VALUES (?, ?, ?)",[token,name,0],(err,rows,fields)=>{
            if(err){
                console.error('error inserting user ',err)
                return
            }
            console.log('User inserted:', rows);
        })
        res.redirect('/buzzer')
    }
    
})

let hasBuzzed = false;
let firstBuzzer = null;


function resetBuzzers() {
    hasBuzzed = false;
    firstBuzzer = null;
    console.log('Buzzers reset');
  }



app.ws('/ws',(ws,req)=>{
    ws.on('message',(msg)=>{
        if(msg == "true"){
            resetBuzzers()
        }
        else{
            if (!hasBuzzed) {
                hasBuzzed = true;
                firstBuzzer = msg;
                console.log(`${firstBuzzer} buzzed first!`);
                let clientSet = expressws.getWss().clients
               for(let client of clientSet){
                client.send(firstBuzzer)
               }
                
              }
            console.log(req.cookies.user_token ,msg)
        }
    })

    ws.on('close', () => {
        console.log('Client disconnected');
      });
})




app.listen(port,()=>{
    console.log(`listening on port:${port}`)
})