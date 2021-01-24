var express = require('express');
var router = express.Router()
var productHelpers = require('../helpers/productHelpers');
var adminHelpers = require('../helpers/adminHelpers');
const { addProduct } = require('../helpers/productHelpers');

/* GET users listing. */
const verifyLogin = (req, res , next) => {
  if(req.session.adminLoggdin) {
    next();
  }else{
    res.redirect('/admin/login');
  }
}

router.get('/',verifyLogin, function(req, res, next) {
  let admin = req.session.admin;
  productHelpers.getProduct().then((products)=> {
    res.render('./admin/viewProducts', { admin:true, products, admin});
  })

});

router.get('/addProduct', (req,res) => {
  res.render('./admin/addProducts')
});

router.post('/addProduct', (req,res) => {
  console.log(req.body);
  console.log(req.files.image);
  productHelpers.addProduct(req.body).then((id)=> {
    let image = req.files.image;
    image.mv('./public/images/'+ id + '.jpg', (err, done) => {
      if(!err){
        res.redirect('/admin')
      }
    })

  })
});

router.get('/deleteProduct/:id', (req, res) => {
  productHelpers.deleteProduct(req.params.id).then(() => {
    res.redirect('/admin');
  })
  console.log(req.params.id)
});

router.get('/editProduct/:id',async (req, res) => {
 let product=await productHelpers.getProductDetails(req.params.id)
  res.render('./admin/editProducts', {product})

});

router.post('/editProduct/:id', (req, res) => {
  productHelpers.editProduct(req.params.id, req.body).then(() => {
    res.redirect('/admin');
    if(req.files.image){
      let image = req.files.image;
      image.mv('./public/images/'+req.params.id+".jpg")
    }
  })
});

router.get('/signup',(req, res) => {
  res.render('./admin/signup')
});

router.post('/signup', (req, res) => {
  adminHelpers.signUp(req.body).then((response) =>{
    req.session.admin = response;
    req.session.adminLoggdin = true;
    res.redirect('/admin')
  })
});

router.get('/logout', (req, res) => {
  req.session.admin = null;
  req.session.adminLoggdin=false;
  res.redirect('/')
});

router.get('/login', (req, res) => {
  res.render('./admin/login')
});

router.post('/login', (req, res) => {
  console.log(req.body)
  adminHelpers.login(req.body).then((response) => {
    if(response.status) {
      req.session.admin = response.admin;
      req.session.adminLoggdin = true;
      res.redirect('/admin')
    }else{
      res.redirect('/login',)
    }
  })
});

router.get('/orderDetails', async(req, res) => {
  let orderDetails = await adminHelpers.getOrders();
  res.render('./admin/orderDetails', {orderDetails})
})











module.exports = router;
