const postsCollection = require('../db').db().collection('posts')
// MongoDB의 특별한 기능! string 타입의 id를 Object로!
const ObjectID = require('mongodb').ObjectID
const User = require('./User')

let Post = function(data, userid) {
    this.data = data
    this.errors = []
    this.userid = userid
}

Post.prototype.cleanUp = function() {
    if (typeof(this.data.title) != 'string') {this.data.title = ''}
    if (typeof(this.data.body) != 'string') {this.data.body = ''}

    // get rid of any bogus property
    this.data = {
        title: this.data.title.trim(),
        body: this.data.body.trim(),
        // built-in Date 오브젝트가 JavaScript에 있음, 아래는 현재의 시간을 나타냄
        createdDate: new Date(),
        author: ObjectID(this.userid)
    }
}

Post.prototype.validate = function() {
    if (this.data.title == '') {this.errors.push("You must provide a title.")}
    if (this.data.body == '') {this.errors.push("You must provide post content.")}
}

Post.prototype.create = function() {
    return new Promise((resolve, reject) => {
        this.cleanUp()
        this.validate()
        if (!this.errors.length) {
            // save post into database
            postsCollection.insertOne(this.data).then(() => {
                resolve()
            }).catch(() => {
                this.errors.push("Please try later again.")
                reject(this.errors)
            })
        } else {
            reject(this.errors)
        }
    })
}

Post.reusablePostQuery = function(uniqueOperations) {
    return new Promise(async (resolve, reject) => {
        let aggOperations = uniqueOperations.concat([
            {$lookup: {from: 'users', localField: 'author', foreignField: '_id', as: 'authorDocument'}},
            {$project: {
                title: 1,
                body: 1,
                createdDate: 1,
                author: {$arrayElemAt: ['$authorDocument', 0]}
            }}
        ])

        let posts = await postsCollection.aggregate(aggOperations).toArray()

        // clean up author property in each post object
        posts = posts.map(function(post) {
            post.author = {
                username: post.author.username,
                avatar: new User(post.author, true).avatar
            }
            return post
        })

        resolve(posts)
    })
}

Post.findSingleById = function(id) {
    return new Promise(async (resolve, reject) => {
        if (!ObjectID.isValid(id) || typeof(id) != 'string') {
            reject()
            return
        }
        
        let posts = await Post.reusablePostQuery([
            {$match: {_id: new ObjectID(id)}}
        ])

        if (posts.length) {
            console.log(posts[0])
            resolve(posts[0])
        } else {
            reject()
        }
    })
}

Post.findByAuthorId = function(authorId) {
    return Post.reusablePostQuery([
        {$match: {author: authorId}},
        {$sort: {createdDate: 1}} // 1 ascending order, 0 descending order
    ])
}

module.exports = Post