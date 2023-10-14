const express = require("express");

const path = require("path");

const app = require("./app");

const auth = require("./middleware/auth");
const auth1 = require("./middleware/auth1");

const port = 4001;

const hbs = require('hbs');
const { recharge, customers, stocks } = require("./model/user");

const publicDir = path.join(__dirname, './public')
app.use(express.static(publicDir))
app.set('view engine', 'hbs')

app.use(express.urlencoded({ extended: false }));

const login = path.join(__dirname, '/views')
app.use(express.static(login))
app.set('view engine', 'hbs')
app.get('/', (req, res) => {
    res.render("login");
});

app.get('/register', (req, res) => {
    res.render("register");
});

app.get('/adminpending', auth1, async (req, res) => {
    try {
        var total = await customers.find({}).countDocuments();

        //console.log(total)
        const query = { status: "Pending" };

        const docs = await recharge.find(query).exec();
        res.render("adminpending", {
            list: docs,
            total
        });
    } catch (error) {
        console.log(error)
    }
});

app.get('/adminsuccess', auth1, async (req, res) => {
    try {
        const query = { status: { $ne: "Pending" } };
        const docs = await recharge.find(query).exec();

        res.render("adminsuccess", {
            list: docs,
        });
    } catch (err) {
        console.error(err);
        // Handle the error appropriately
        res.status(500).send("Internal Server Error");
    }
});


app.get('/userstatus', auth, (req, res) => {
    const email = req.cookies.email;

    recharge.find({ email })
        .then(docs => {
            if (docs && docs.length > 0) {
                res.render("userstatus", {
                    list: docs,
                });
            } else {
                res.render("userstatus", {
                    list: docs,
                });
            }
        })
        .catch(err => {
            console.error(err);
        });
});


const axios = require('axios');
const cheerio = require('cheerio');
app.get('/index', auth, async (req, res) => {
    try {
        const result = await stocks.findOne(
            { stocks: "admin" },
            { notice: 1, url: 1, website: 1, _id: 0 }
        );

        const url = result.url;
        const website = result.website;
        const notice = result.notice;

        if (website == "White Devil") {
            async function fetchBoosterValue() {
                try {
                    const response = await axios.get(url);
                    const html = response.data;

                    const $ = cheerio.load(html);
                    const boosterValue = $('font[color="#B600BD"]').text();

                    // Extract the number from the string, considering the format ":BOOSTER LEFT = xxx:-"
                    const regex = /(\d+)/;
                    const matches = boosterValue.match(regex);

                    if (matches) {
                        const boosterLeft = matches[0];
                        //console.log('BOOSTER LEFT:', boosterLeft);
                        return boosterLeft;
                    } else {
                        console.log('BOOSTER value not found.');
                    }
                } catch (error) {
                    console.error('Error:', error);
                }
            }

            var stockss = await fetchBoosterValue();
            //console.log(notice)
            if (stockss > 50) {
                res.render("index", {
                    notice,
                    stockss,

                });
            } else {
                res.status(401).send("No Stocks Available Please Wait for few hours");
            }
        } else if (website == "Noobra") {
            console.log("Currently not available");
            res.status(200).send("Currently not available");
        } else {
            console.log("Currently not available");
            res.status(200).send("No Stocks Available Please Wait for few hours");
        }
    } catch (error) {
        //console.log("Website is under Setup Please Wait");
        res.status(401).send("Website is under Setup Please Wait");
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
