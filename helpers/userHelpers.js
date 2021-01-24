var db = require('../config/connection');
var collection = require('../config/collection');
var bcrypt = require('bcrypt');
var objectId = require('mongodb').ObjectID;
const { response } = require('express');
const Razorpay = require('razorpay');
var instance = new Razorpay({
    key_id: 'rzp_test_JEX0MmRrh5yfAV',
    key_secret: 'DVa4pKfLKcUpH8WXWCCJLday',
});

module.exports = {
    signUp: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.password = await bcrypt.hash(userData.password, 10);
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                resolve(data.ops[0])
            })
            console.log(userData)
        })

    },

    login: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false;
            let response = {}
            console.log(userData);
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email });
            if (user) {
                bcrypt.compare(userData.password, user.password).then((status) => {
                    if (status) {
                        console.log("login success");
                        response.user = user;
                        response.status = true;
                        resolve(response);
                    } else {
                        console.log('login failed')
                        resolve({ status: false })
                    }
                })
            } else {
                console.log('login fail');
                resolve({ status: false })
            }
        })
    },


    addToCart: (proID, userID) => {
        let proObject = {
            item: objectId(proID),
            qty: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userID) });
            if (userCart) {
                let productExist = userCart.products.findIndex(product => product.item == proID);
                console.log(productExist);
                if (productExist !== -1) {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userID), 'products.item': objectId(proID) },
                        {
                            $inc: { 'products.$.qty': 1 }
                        }
                    ).then(() => {
                        resolve()
                    })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userID) },
                        {
                            $push: { products: proObject }
                        }).then(() => {
                            resolve()
                        })
                }
            } else {
                let cartObject = {
                    user: objectId(userID),
                    products: [proObject]
                }

                db.get().collection(collection.CART_COLLECTION).insertOne(cartObject).then((result) => {
                    resolve()
                })
            }
        })
    },

    cartRemoveItem: (userID, proID) => {

        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId(userID) }, { _id: objectId(proID) }).then(() => {
                resolve()
            })
        })
    },

    getCartProducts: (user) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(user) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        qty: '$products.qty'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, qty: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }

            ]).toArray()
            resolve(cartItems)
        })
    },

    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) });
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },

    changeProductQuantity: (Details) => {
        return new Promise((resolve, reject) => {
            if (Details.count == -1 && Details.quantity == 1) {
                db.get().collection(collection.CART_COLLECTION).
                    updateOne({ _id: objectId(Details.cart) },
                        {
                            $pull: { products: { item: objectId(Details.product) } }
                        }
                    ).then((response) => {
                        resolve({ removeItem: true })
                    })
            } else {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(Details.cart), 'products.item': objectId(Details.product) },
                    {
                        $inc: { 'products.$.qty': parseInt(Details.count) }
                    }
                ).then((response) => {
                    console.log(response);
                    resolve({ status: true })
                })
            }
        })
    },

    getTotalAmount: (userID) => {
        return new Promise(async (resolve, reject) => {

            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userID) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        qty: '$products.qty',
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, qty: 1, product: { $arrayElemAt: ['$product', 0] }
                    }

                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$qty', '$product.price'] } }
                    }
                }

            ]).toArray()
            console.log(total[0].total);
            resolve(total[0].total)



        })

    },

    placeOrder: (order, products, total) => {
        return new Promise((resolve, reject) => {
            console.log(order, products, total);
            let status = order.paymentMethod === 'COD' ? 'Placed' : 'pending'
            let orderObject = {
                deliveryDetails: {
                    mobile: order.mobileNumber,
                    address: order.address,
                    pincode: order.pincode
                },
                userId: objectId(order.userId),
                paymentMethod: order.paymentMethod,
                products: products,
                status: status,
                date: new Date(),
            }

            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObject).then((response) => {
                db.get().collection(collection.CART_COLLECTION).removeOne({ user: objectId(order.userId) })
                resolve(response.ops[0]._id);
            })
        })
    },

    getCartProductsList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            resolve(cart.products)
        })
    },

    getOrderDetails: (userID) => {
        console.log(userID);
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: objectId(userID) }).toArray()
            resolve(orders)
            console.log(orders)
        })
    },

    getOrderedProducts: (orderID) => {
        return new Promise(async (resolve, reject) => {
            let orderedItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderID) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        qty: '$products.qty'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, qty: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }

            ]).toArray()
            console.log(orderedItems)
            resolve(orderedItems)
        })
    },

    payRazorPay: (orderId, total) => {
        return new Promise((resolve, reject) => {
            var options = {
                amount: total * 100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: "" + orderId,
            };
            instance.orders.create(options, function (err, order) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(order);
                    resolve(order)
                }

            });
        })
    },



    verifyPayment: (paymentDetails) => {
        return new Promise((resolve, reject) => {
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'DVa4pKfLKcUpH8WXWCCJLday')
            hmac.update(paymentDetails['payment[razorpay_order_id]'] + '|' + paymentDetails['payment[razorpay_payment_id]']);
            hmac = hmac.digest('hex');
            if (hmac == paymentDetails['payment[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }
        })
    },

    changePaymentStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                {
                    $set: {
                        status: 'placed'
                    }
                }
            ).then(() => {
                resolve()
            })
        })
    }
}