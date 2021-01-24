var bcrypt = require('bcrypt');
var db = require('../config/connection');
var collection = require('../config/collection');
const { ObjectId } = require('mongodb');
const { response } = require('express');


module.exports = {
    signUp:(adminData) => {
        return new Promise (async(resolve, reject) => {
            adminData.password =await bcrypt.hash(adminData.password, 10);
            db.get().collection(collection.ADMIN_COLLECTION).insertOne(adminData).then((data) =>{
                resolve(data.ops[0])
            })
        })
    },

    login:(adminData) => {
        let response = {}
        return new Promise (async(resolve, reject)=> {
            
            let admin =await db.get().collection(collection.ADMIN_COLLECTION).findOne({email:adminData.email});
            console.log(admin)
            if(admin){
                bcrypt.compare(adminData.password, admin.password).then((status) =>{
                    if(status){
                        console.log("admin login success");
                        response.admin = admin;
                        response.status = true;
                        resolve(response)
                    }else{
                        resolve({status:false})
                        console.log("admin login fail");
                    }
                })
            }else{
                console.log("admin fail");
                resolve({status:false})
            }
        } )
    },

    getOrders : () => {
        return new Promise ( async( resolve, reject ) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find().toArray().then((response) => {
                resolve(response);
            })
        })
    }
}