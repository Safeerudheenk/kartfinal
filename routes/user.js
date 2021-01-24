const { response } = require('express')
var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/productHelpers');
const userHelpers = require('../helpers/userHelpers');
/* GET home page. */
const verifyLogin = (req, res, next) => {
  if (req.session.userLoggedin) {
    next();
  } else {
    res.redirect('/login');
  }
}

router.get('/', async function (req, res, next) {
  let user = req.session.user;
  let cartCount = null
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  productHelpers.getProduct().then((products) => {
    res.render('./user/index', { admin: false, products, user, cartCount })
  });
});

router.get('/productDetails/:id', async (req, res) => {
  let product = await productHelpers.getProductDetails(req.params.id);
  res.render('./user/productDetails', { product });
})

router.get('/login', (req, res) => {
  if (req.session.userLoggedin) {
    res.redirect('/');
  } else {
    res.render('./user/login', { "loginErr": req.session.userLoggedinErr });
    req.session.userLoggedinErr = false;
  }
});

router.get('/signup', (req, res) => {
  res.render('./user/signup');
});

router.post('/signup', (req, res) => {
  userHelpers.signUp(req.body).then((response) => {
    req.session.user = response;
    req.session.userLoggedin = true;
    console.log(response);
    res.redirect('/');
  });
});

router.post('/login', (req, res) => {
  userHelpers.login(req.body).then((response) => {
    if (response.status) {
      req.session.user = response.user;
      req.session.userLoggedin = true;
      res.redirect('/');
    } else {
      req.session.userLoggedinErr = "invalid username or password!!"
      res.redirect('/login');
    }
  });
});

router.get('/logout', (req, res) => {
  req.session.user = null;
  req.session.userLoggedin = false;
  res.redirect('/');
});

router.get('/cart', verifyLogin, async (req, res) => {
  let user = req.session.user
  let product = await userHelpers.getCartProducts(req.session.user._id);
  let total = 0
  if (product.length > 0) {
    total = await userHelpers.getTotalAmount(req.session.user._id);

  }
  res.render('./user/cart', { product, user, total });
});

router.get('/addToCart/:id', (req, res) => {
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true })
  });
});

router.get('/cartRemoveItem/:id', (req, res) => {
  userHelpers.cartRemoveItem(req.session.user._id, req.params.id).then(() => {
    res.redirect('/cart');
  })
})


router.post('/changeProductQuantity', async (req, res) => {
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = 0
    let product = await userHelpers.getCartProducts(req.session.user._id);
    if (product.length > 0) {
      response.total = await userHelpers.getTotalAmount(req.session.user._id);

    }
    res.json(response)

  })
});

router.get('/placeOrder', verifyLogin, async (req, res) => {
  let user = req.session.user;
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  let products = await userHelpers.getCartProducts(req.session.user._id);
  res.render('./user/placeOrder', { total, products, user })
});


router.post('/placeOrder', async (req, res) => {
  let products = await userHelpers.getCartProductsList(req.body.userId);
  let total = await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body, products).then((orderId) => {
    if (req.body.paymentMethod === 'COD') {
      res.json({ success: true });
    } else {
      userHelpers.payRazorPay(orderId, total).then((response) => {
        console.log(response)
        res.json(response);
      })
    }

  });
});

router.get('/orderConfirm', (req, res) => {
  res.render('./user/orderConfirm')
});

router.get('/orders', async (req, res) => {
  let orderDetails = await userHelpers.getOrderDetails(req.session.user._id)
  res.render('./user/orders', { orderDetails });
});

router.get('/orderViewProducts/:id', async (req, res) => {
  let product = await userHelpers.getOrderedProducts(req.params.id)
  res.render('./user/orderViewProducts', { product })

});


router.post('/verifyPayment', (req, res) => {
  console.log(req.body);
  userHelpers.verifyPayment(req.body).then(() => {
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(() => {
      console.log("successful");
      res.json({ status: true });
    })
  }).catch((err) => {
    res.json({ status: false });
  });
})


module.exports = router;
