const bcrypt = require('bcryptjs')
const usersCollection = require('../db').db().collection('users')
const validator = require('validator')
// 프로필 사진을 위해 gravatar에 접속할 때 url에 ''md5로 해싱''된 이메일이 포함되기 때문에 사용
const md5 = require('md5')
const { use } = require('marked')

// below 'constructor function' is reusable to make User object anytime.
let User = function(data, getAvatar) {
    this.data = data
    this.errors = []
    if (getAvatar == undefined) {getAvatar=false}
    if (getAvatar) {this.getAvatar()}
}

// '.prototype'은 method 선언 방법인데, constructor function이 새로 호출될 때마다 메모리에 메소드가 중복되어 생성되는 것을 방지한다.
// 원리는 아직 모르겠다.
User.prototype.cleanUp = function() {
    if (typeof(this.data.username) != 'string') {this.data.username = ''}
    if (typeof(this.data.email) != 'string') {this.data.email = ''}
    if (typeof(this.data.password) != 'string') {this.data.password = ''}

    // get rid of any bogus properties
    this.data = {
        username: this.data.username.trim().toLowerCase(),
        email: this.data.email.trim().toLowerCase(),
        password: this.data.password
    }
}

User.prototype.validate = function() {
    return new Promise(async (resolve, reject) => {
        if (this.data.username == '') {this.errors.push("You must provide a username.")}
        if (this.data.username != '' && !validator.isAlphanumeric(this.data.username)) {this.errors.push("Username can only contain letters and numbers.")}
        if (this.data.username.length > 0 && this.data.username.length < 3) {this.errors.push("Username must be at least 3 characters.")}
        if (this.data.username.length > 30) {this.errors.push("Username cannot exceed 30 characters.")}
        if (!validator.isEmail(this.data.email)) {this.errors.push("You must provide a valid email address.")}
        if (this.data.password == '') {this.errors.push("You must provide a password.")}
        if (this.data.password.length > 0 && this.data.password.length < 10) {this.errors.push("Password must be at least 10 characters.")}
        if (this.data.password.length > 50) {this.errors.push("Password cannot exceed 50 characters.")}
    
        // Only if username is valid then check to see if it's already taken
        if (this.data.username.length >= 3 && this.data.username.length <= 30 && validator.isAlphanumeric(this.data.username)){
            let usernameExists = await usersCollection.findOne({username: this.data.username})
            if (usernameExists) {this.errors.push("That username is already taken.")}
        }
        
        // Only if email is valid then check to see if it's already taken
        if (validator.isEmail(this.data.email)){
            let emailExists = await usersCollection.findOne({email: this.data.email})
            if (emailExists) {this.errors.push("That email is already being used.")}
        }
        resolve()
    })
}

User.prototype.login = function() {
    return new Promise((resolve, reject) => {
        this.cleanUp()
        usersCollection.findOne({username: this.data.username})
            .then((attemptedUser) => {
                if (attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)) {
                    this.data = attemptedUser
                    this.getAvatar()
                    resolve()
                } else {
                    reject('Invalid username / password.')
                }
            })
            .catch(function() {
                reject('Please try later again.')
            }) 
    })
}

User.prototype.register = function() {
    return new Promise(async (resolve, reject) => {
        // Step #1: Validate user data
        this.cleanUp()
        await this.validate()
    
        // Step #2: Only if there is no validation errors
        // then save the user data into a database
        if (!this.errors.length) {
            // hash user password
            let salt = bcrypt.genSaltSync(10)
            this.data.password = bcrypt.hashSync(this.data.password, salt)
            await usersCollection.insertOne(this.data)
            // 위의 db insert보다 나중에 getAvatar를 실행하는 이유는
            // db에 md5 url을 포함하여 저장하지 않게 하기 위해
            // 그 이유는 md5의 url 포맷이 언제든 바뀔 수 있는 반면, 그 자체는 굉장히 가벼운 계산이기 때문에,
            // 매번 바꾸는 게 db에 저장하는 것보다 합리적이다.
            this.getAvatar()
            resolve(this.data.username)
        } else {
            reject(this.errors)
        }
    })
}

User.prototype.getAvatar = function() {
    this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`
}

User.findByUsername = function(username) {
    return new Promise((resolve, reject) => {
        if (typeof(username) != 'string') {
            reject()
            return
        }
        usersCollection.findOne({username: username})
            .then((userDoc) => {
                if (userDoc) {
                    userDoc = {
                        _id: userDoc._id,
                        username: userDoc.username,
                        avatar: new User(userDoc, true).avatar
                    }
                    resolve(userDoc)
                } else {
                    reject()
                }
            })
            .catch(() => {
                reject()
            })
    })
}

module.exports = User