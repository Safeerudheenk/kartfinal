const mongoClient = require('mongodb').MongoClient;

const state = {
    db: null
}

module.exports.connect = function (done) {
    const url = 'mongodb+srv://admin:goget123@cluster0.ktece.mongodb.net/cart1?retryWrites=true&w=majority'
    const dbname = 'purchasing'

    mongoClient.connect(url, (err, data) => {
        if (err) return done(err)
        state.db = data.db(dbname)

        done()
    })
}

module.exports.get = function () {
    return state.db
}