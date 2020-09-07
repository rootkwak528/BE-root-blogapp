// This is top level of ourApp

// Require an Express framework
const express = require('express')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)    // MongoDB에 session 저장하기 위함
const flash = require('connect-flash')  // flash message 사용 위함
const app = express()

// Configure the setting for session
let sessionOptions = session({
    secret: "JavaScript is sooooooo cool.",
    // store의 default는 로컬 메모리임
    store: new MongoStore({client: require('./db')}),
    // 밑에 두 줄은 거의 관용임
    resave: false,
    saveUninitialized: false,
    // 쿠키 지속시간(ms)
    cookie: {maxAge: 1000 * 60 * 60 * 24, httpOnly: true}
})

// Support sessions
app.use(sessionOptions)
app.use(flash())

app.use(function(req, res, next) {
    res.locals.user = req.session.user
    next()
})

const router = require('./router')
const User = require('./models/User')

// Enable the features from users(browsers)
app.use(express.urlencoded({extended: false}))  // from html
app.use(express.json()) // from json

// Set the directory for the views
app.use(express.static('public'))   // 홈페이지를 방문하는 누구나 사용할 수 있는 '공용' 파일을 보관하는 폴더, CSS나 browser based JS 파일이 대표적
app.set('views', 'views')   // 'views'(this is express option), folder name
app.set('view engine', 'ejs')   // 'view engine', template name (ex. ejs)

app.use('/', router)    // '/'로 request가 오면 router를 실행한다.

module.exports = app