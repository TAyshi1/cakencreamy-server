const express = require('express')
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000
app.use(express.json());
app.use(cors())
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const SECRET_KEY = 'b9682406b6545de642ff8026527300b35ec4d70803b4fe40ce37c9ea292634bcb3829fad2e685531abc6bc15e6243f2e06e46e8d9c9c28a407c8f01af5761378';

const uri = 'mongodb+srv://mohid10587:jUWk8Fjxf3UAqusZ@cluster0.aqkhuox.mongodb.net/?retryWrites=true&w=majority'
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];

    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {

        if (err) return res.sendStatus(403);

        req.user = user;

        next();
    });
}




async function run() {
    try {
        await client.connect()
        console.log('connected')
        const productsCollection = client.db('ayshi').collection('products');
        const cartProductsCollection = client.db('ayshi').collection('cart')
        const ordersCollection = client.db('ayshi').collection('orders')
        const usersCollection = client.db('ayshi').collection('users')


        app.post("/addProduct", async (req, res) => {
            try {
                const product = req.body;
                const result = await productsCollection.insertOne(product);
                res.status(200).json({ message: "Product added successfully" });
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: "Server error" });
            }
        });


        app.get('/getProduct', async (req, res) => {

            const result = await productsCollection.find({}).toArray()

            res.send(result)
        })







        // delete a products
        app.delete('/products/:productId', async (req, res) => {
            try {
                const productId = req.params.productId;

                // Check if the product exists
                const product = await productsCollection.findOne({ _id: new ObjectId(productId) });
                if (!product) {
                    return res.status(404).json({ message: 'Product not found' });
                }

                // Delete the product
                await productsCollection.deleteOne({ _id: new ObjectId(productId) });

                res.json({ message: 'Product deleted successfully' });
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: 'Server error' });
            }
        });

        app.get('/productByFlavour/:flavour', async (req, res) => {
            const flavour = req.params.flavour;
            const result = await productsCollection.find({ flavorName: flavour }).toArray();

            if (result) {
                // Product found
                res.status(200).json(result);
            } else {
                // Product not found
                res.status(404).json({ message: `Product with id ${productId} not found` });
            }
        });





        app.get('/cakeType/:category', async (req, res) => {
            const category = req.params.category;
            const result = await productsCollection.find({ categoryName: category }).toArray();

            if (result) {
                // Product found
                res.status(200).json(result);
            } else {
                // Product not found
                res.status(404).json({ message: `Product  not found` });
            }
        });




        app.get('/productDetails/:productId', async (req, res) => {
            const productId = req.params.productId;
            const result = await productsCollection.findOne({ _id: new ObjectId(productId) });

            if (result) {
                // Product found
                res.status(200).json(result);
            } else {
                // Product not found
                res.status(404).json({ message: `Product with id ${productId} not found` });
            }
        });



        app.post("/storeIntoCart", async (req, res) => {
            try {

                const product = req.body
                const result = await cartProductsCollection.insertOne(product)

                res.status(200).json({ success: true, message: "Product added to cart" })

            } catch (error) {
                console.error(error)
                res.status(500).json({ success: false, message: "An error occurred while adding product to cart" })
            }
        });


        app.get("/cartProducts/:email", authenticateToken, async (req, res) => {

            const email = req.params.email
            try {
                const cartProducts = await cartProductsCollection.find({ email }).toArray()
                res.status(200).json(cartProducts)

            } catch (error) {
                console.error(error)
                res.status(500).json({ message: "An error occurred while retrieving cart products" })
            }
        })





        // Insert the data into the "orders" collection
        app.post('/orderedProducts', async (req, res) => {
        
            try {
                const data = req.body;

                // Insert the data into the "orders" collection
                const result = await ordersCollection.insertOne(data);
            
                // Send a success response
                res.status(200).json({ message: 'Order placed successfully' });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });



        // get ordered products
        app.get('/orderedProducts', authenticateToken, async (req, res) => {
            try {
                // Retrieve all orders from the "orders" collection
                const orders = await ordersCollection.find().toArray();

                // Send the orders as a response
                res.status(200).json(orders);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });



        // sign up route 
        app.post("/signup", async (req, res) => {
            try {
                const { name, email, password } = req.body;
                const hashedPassword = await bcrypt.hash(password, 10);

                const newUser = {
                    name,
                    email,
                    password: hashedPassword,
                };

                const result = await usersCollection.insertOne(newUser);

                const user = await usersCollection.findOne({ email });

                const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: '1d' });

                res.status(200).json({ token });
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: "Server error" });
            }
        });

        // Login Route
        app.post('/login', async (req, res) => {
            try {
                const { email, password } = req.body;

                // Check if user exists
                const user = await usersCollection.findOne({ email });
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                // Check if password is correct
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) {
                    return res.status(400).json({ message: 'Invalid credentials' });
                }

                // Create and sign JWT token
                const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: '1d' });

                res.json({ token });
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: 'Server error' });
            }
        });

        // check user or admin 
        app.get('/users/:email', async (req, res) => {
            try {
                const email = req.params.email;
                const user = await usersCollection.findOne({ email });
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                return res.status(200).json(user);
            } catch (err) {
                console.error(err);
                return res.status(500).json({ message: 'Server error' });
            }
        });




        //  forgot password 

        app.post('/reset-password/:email', async (req, res) => {
            try {
                const { email } = req.params;
                const { newPassword } = req.body

                // Check if user exists
                const user = await usersCollection.findOne({ email });
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                // Generate new password

                const hashedPassword = await bcrypt.hash(newPassword, 10);

                // Update user's password
                await usersCollection.updateOne({ email }, { $set: { password: hashedPassword } });

                // Send new password to user
                res.json({ message: `Your new password is: ${newPassword}` });
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: 'Server error' });
            }
        });

        // delete a user 

        app.delete('/deleteUser/:id', async (req, res) => {
          
            const { id } = req.params;
           
            try {
              
                const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
                console.log(result)
                res.send({ message: 'User deleted successfully', result });
            } catch (err) {
                res.status(500).send({ message: 'Something went wrong' });
            }
        });


        //   get all users
        app.get('/users', authenticateToken, async (req, res) => {

            try {
                const users = await usersCollection.find({}).toArray();
                
                res.json(users);
            } catch (err) {
                console.error(err);
                res.status(500).send('Server error');
            }
        });

        // Route to retrieve the current user's information
        app.get('/me', authenticateToken, async (req, res) => {
            try {
                const { userId } = req.user;
                const token = req.headers.authorization.split(' ')[1];
                const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                res.status(200).json({ email: user.email, token });
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: 'Internal server error' });
            }
        });








    } finally {

    }

}

run().catch(console.dir)


app.get('/', async (req, res) => {
    res.send('This is  deployment in render')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
