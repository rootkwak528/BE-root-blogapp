const User = require('../models/User')
const Post = require('../models/Post')

exports.mustBeLoggedIn = function(req, res, next) {
    if (req.session.user) {
        next()
    } else {
        req.flash('errors', "You must be logged in first.")
        req.session.save(function() {
            res.redirect('/')
        })
    }
}

exports.login = function(req, res) {
    let user = new User(req.body)
    user.login()
        .then(() => {
            req.session.user = {username: req.body.username, avatar: user.avatar, _id: user.data._id}
            // 위의 세션 수정이 완료된 이후에 리디렉트하게끔 하기 위해 save 함수의 콜백함수로 리디렉트를 한다
            req.session.save(function() {
                res.redirect('/')
            })
        })
        .catch((e) => {
            req.flash('errors', e)
            // req.session.flash.errors = [e] 가 위 코드의 실제 뜻 (별거없지만 단순화에 좋다한다)
            req.session.save(function() {
                res.redirect('/')
            })
        })
}

exports.logout = function(req, res) {
    // 아쉽게도 session package function이 promise를 return하지 않아서 promise는 사용못함
    req.session.destroy(function() {
        res.redirect('/')
    })
}

exports.register = async function(req, res) {
    let user = new User(req.body)
    await user.register()
        .then((username) => {
            req.session.user = {username: username, avatar: user.avatar, _id: user.data._id}
            req.session.save(function() {
                res.redirect('/')
            })
        })
        .catch((regErrors) => {
            regErrors.forEach(function(error) {
                req.flash('regErrors', error)
            })
            req.session.save(function() {
                res.redirect('/')
            })
        })
}

exports.home = function(req, res) {
    if (req.session.user) {
        res.render('home-dashboard')
    } else {
        // req.flash 를 하면, session에서 꺼내쓰고 session을 바로 삭제해준다
        res.render('home-guest', {regErrors: req.flash('regErrors')})
    }
}

exports.ifUserExists = function(req, res, next) {
    User.findByUsername(req.params.username)
        .then((userDocument) => {
            req.profileUser = userDocument
            next()
        })
        .catch(() => {
            res.render('404')
        })
}

exports.profilePostsScreen = function(req, res) {
    // Ask our post model for posts by a certain author id
    Post.findByAuthorId(req.profileUser._id)
        .then((posts) => {
            res.render('profile', {
                profileUsername: req.profileUser.username,
                profileAvatar: req.profileUser.avatar,
                posts: posts
            })
        })
        .catch(() => {
            res.render('404')
        })
}