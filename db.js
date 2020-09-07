// below 2 lines are for environment variables!
const dotenv = require('dotenv')
dotenv.config()
const mongodb = require('mongodb')

mongodb.connect(process.env.CONNECTIONSTRING, {useNewUrlParser: true, useUnifiedTopology: true}, function(err, client) {
    // client 자체를 객체화해서 리턴시킴
    module.exports = client

    // now, app starts to open the port right after db get connected.
    const app = require('./app')
    // app.listen()이 가능하단말인즉슨, module.exports를 하면 객채의 복제품이 가는게 아니라 본체 자체를 리턴하고 또 소환받는 거구나.
    app.listen(process.env.PORT)
})