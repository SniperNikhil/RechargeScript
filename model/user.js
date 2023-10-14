const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
    email: { type: String, default: null,unique:true },
    password: { type: String },
    token: { type: String },
});

const rechargeSchema = new mongoose.Schema({
    email: { type: String},
    payment:{ type: String},
    number:{ type: String},
    operator:{type:String},
    upiid:{type:String},
    status:{type:String},
    orderid:{type:String},
})

const stocksSchema =new mongoose.Schema({
    stocks:{type:String, default:"admin"},
    url:{type:String},
    website:{type:String},
    notice:{type:String,default:"null"},
})

const customers = mongoose.model('customers', customerSchema);
const recharge = mongoose.model('recharge', rechargeSchema);
const stocks = mongoose.model('stock', stocksSchema);

module.exports = {             
    customers , recharge ,stocks
}