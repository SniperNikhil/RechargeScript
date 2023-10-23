const express = require("express");
const bcrypt = require('bcryptjs');
const app = express();
var jwt = require('jsonwebtoken');
require("dotenv").config();
require("./config/database").connect();
var cookieParser = require('cookie-parser')
const { customers, recharge, stocks } = require("./model/user");
let multer = require('multer');
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.post("/register", async (req, res) => {
    //As we are dealing with database it may return an exception so use try catch block
    try {
        var { email, password } = req.body;

        const oldUser = await customers.findOne({ email });

        if (oldUser) {
            return res.render('register', {
                success: "User Already Exist. Please Login"
            })
        }

        encryptedPassword = await bcrypt.hash(password, 10);

        const customer = await customers.create({
            email: email.toLowerCase(),
            password: encryptedPassword,
        });

        const token = await jwt.sign(
            { email },
            process.env.TOKEN_KEY,
            {
                expiresIn: "2h",
            }
        );

        customer.token = token;

        res.render('register', {
            success: "Successfully Registered as admin"
        })
    } catch (err) {
        console.log(err)
    }
});

const axios = require('axios');
const cheerio = require('cheerio');
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await customers.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password)) || email == process.env.email && password == process.env.password) {
            if (user) {
                const token = await jwt.sign(
                    { user_id: user._id, email: user.email },
                    process.env.TOKEN_KEY,
                    {
                        expiresIn: "2h",
                    }
                );

                res.cookie('x-access-token', token, {
                    secure: true,
                    httpOnly: true,
                    sameSite: 'lax'
                });

                res.cookie('email', user.email);

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
                        console.log(notice)
                        if (stockss > 50) {
                            res.render("index", {
                                notice,
                                stockss,

                            });
                        } else {
                            res.status(401).send("No Stocks Available Please Wait for few hours");
                        }
                    } else if (website == "Noobra") {
                        async function fetchBoosterValue() {
                            try {
                                const response = await axios.get(url);
                                const html = response.data;
            
                                const $ = cheerio.load(html);
                                const boosterValue = $('font[color="blue"][size="4px"]').text();
            
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
                    } else {
                        console.log("Currently not available");
                        res.status(200).send("No Stocks Available Please Wait for few hours");
                    }
                } catch (error) {
                    //console.log("Website is under Setup Please Wait");
                    res.status(401).send("Website is under Setup Please Wait");
                }
            } else {
                const token = await jwt.sign(
                    { email: email },
                    process.env.TOKEN_KEY1,
                    {
                        expiresIn: "2h",
                    }
                );

                res.cookie('x-access-token', token, {
                    secure: true,
                    httpOnly: true,
                    sameSite: 'lax'
                });

                res.cookie('email', email);

                const query = { status: "Pending" };

                recharge.find(query)
                    .then(docs => {
                        res.render("adminpending", {
                            list: docs,
                        });
                    })
                    .catch(err => {
                        console.error(err);
                    });

            }
        }
        else {
            res.render('login', {
                success: "Invalid Credentials"
            })
        }
    } catch (err) {
        console.log(err);
    }
});

app.post("/logout", (req, res) => {
    try {
        res.clearCookie('x-access-token');
        res.clearCookie('email');
        return res.redirect('/');
    } catch (err) {
        console.log(err)
    }
})


const storage = multer.diskStorage({
    destination: 'public/payment/',
    filename: (req, file, cb) => {
        const timestamp = Date.now(); // Generate a timestamp
        const originalname = file.originalname;
        const extension = originalname.split('.').pop(); // Get the file extension
        const newFilename = `${timestamp}.${extension}`; // Create a unique filename
        cb(null, newFilename);
    }
});

let upload = multer({       //Here we are uploading our image
    //A StorageEngine responsible for processing files uploaded via Multer
    storage: storage,       //We have passed Storage Setting previous created line no 53-58

    //Here we are validating our uploaded file
    fileFilter: (req, file, cb) => {
        cb(null, true)
    }
})
app.post("/recharge", upload.single('payment'), async (req, res) => {
    const order = await recharge.findOne({ orderid: req.body.orderid });

    //console.log(order);
    if (order) {
        res.render('index', {
            success: "You have alredy Submmited request, for this Payment,please check recharge status",
        })
    } else {
        var recharges = new recharge();
        recharges.email = req.cookies.email;
        recharges.payment = req.file.filename;
        recharges.number = req.body.number;
        recharges.operator = req.body.operator;
        recharges.upiid = req.body.upiid;
        recharges.status = "Pending";
        recharges.orderid = req.body.orderid;

        try {
            const doc = await recharges.save();
            res.render('index', {
                success: "Request Submitted Successfully",
            });
        } catch (err) {
            console.log(err);
            // Handle the error as needed, such as sending an error response to the client
            res.status(500).send("Internal Server Error");
        }
    }
})

app.post("/status", async (req, res) => {
    console.log(req.body.imageName);

    async function updateStatusAndFetchPendingStatus(newStatus) {
        const query = { payment: req.body.imageName };

        try {
            await recharge.updateOne(query, { $set: { status: newStatus } });

            const pendingQuery = { status: "Pending" };
            const docs = await recharge.find(pendingQuery);

            res.render("adminpending", {
                list: docs,
            });
        } catch (err) {
            console.error('Error updating document:', err);
        }
    }

    if (req.body.success) {
        await updateStatusAndFetchPendingStatus("Success");
    } else if (req.body.refund) {
        await updateStatusAndFetchPendingStatus("Refund");
    } else {
        await updateStatusAndFetchPendingStatus("Reject");
    }
});


app.post("/stocks", async (req, res) => {
    await stocks.updateOne(
        { stocks: "admin" },
        {
            $set: {
                url: req.body.url,
                website: req.body.website
            }
        },
        { upsert: true }
    );

    res.redirect("adminpending")
})

app.post("/notice", async (req, res) => {
    await stocks.updateOne(
        { stocks: "admin" },
        {
            $set: {
                notice: req.body.notice,
            }
        },
    );
    res.redirect("adminpending")
})
const fs = require('fs');
const path = require('path');
app.post("/reset", async (req, res) => {
    try {
        const result = await recharge.deleteMany({});
        //console.log(`Deleted ${result.deletedCount} documents from the collection.`);
        const folderPath = path.join(__dirname, 'public', 'payment'); // Replace with your folder path

        async function deleteFilesInFolder(folderPath) {
            try {
                // Read the list of files in the folder
                const files = await fs.promises.readdir(folderPath);

                // Iterate over the files and delete each one
                for (const file of files) {
                    const filePath = path.join(folderPath, file);
                    await fs.promises.unlink(filePath);
                    //console.log(`Deleted file: ${filePath}`);
                }

                //console.log('All files deleted successfully.');
            } catch (error) {
                console.error('Error deleting files:', error);
            }
        }

        await deleteFilesInFolder(folderPath);

        res.redirect("adminpending")

    } catch (error) {
        console.error('Error:', error);
    }
})

module.exports = app;