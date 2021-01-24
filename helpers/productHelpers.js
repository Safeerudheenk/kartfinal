const db = require('../config/connection');
var collection = require('../config/collection');
var objectId = require('mongodb').ObjectID;
const { response } = require('express');

module.exports = {
    getProduct:()=> {
        return new Promise (async(resolve, reject) => {
           let products=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray().then((products) => {
                resolve(products)
            })
        })
    },

    addProduct : (product) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((product) => {
                resolve(product.ops[0]._id)
            })
        })
    },

    deleteProduct : (proId) => {
        return new Promise( (resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).removeOne({_id:objectId(proId)}).then(() => {
                resolve()
            })
        })
    },

    getProductDetails : (proID) => {
        return new Promise ((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(proID)}).then((product) => {
                console.log(product);
                resolve(product)
            })
        })
    }, 

    editProduct : (prodId, product)=> {
        return new Promise (( resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objectId(prodId)},
             {
                 $set:{
                     name:product.name,
                     category:product.category,
                     price:product.price,
                     description:product.description
                 }
             }).then((response) => {
                 resolve();
             })
        })
    }
}