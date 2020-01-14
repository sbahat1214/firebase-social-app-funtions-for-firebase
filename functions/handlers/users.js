const {admin, db} = require('../utils/admin')
const config = require('../utils/config')

const firebase = require('firebase')
firebase.initializeApp(config)

const{validateSignUpData, validateLoginData, useReducedUser} = 
 require('../utils/validators')

exports.signup = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        username: req.body.username
    }

    const { valid, errors} = validateSignUpData(newUser);
    if(!valid) return res.status(400).json(errors);

    const noImage = 'no_user.png'

    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}
    /o/${noImage}?alt=media`.replace(/%20/g, "")

    console.log(imageUrl)
    //Handle username and email

    let token, userID;

    db.doc(`/users/${newUser.username}`).get()
    .then(doc => {

        // check if username already in use
        if(doc.exists){
            return res.status(400).json({username: 'username already in use'})
        }else{
            return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
        }
    }) // get userId and token
    .then(data=> {
        userID= data.user.uid;
        return data.user.getIdToken()
    })//set userToken and Credentials in firestore
    .then((idToken)=>{
        token = idToken
        const userCredentials = {
            username: newUser.username,
            email: newUser.email,
            imageUrl: `https://firebasestorage.googleapis.com/v0/b/fir-test-b29f1.appspot.com/o/${noImage}?alt=media`.trim(' '),
            createdAt: new Date().toISOString(),
            userID
        }
        db.doc(`/users/${newUser.username}`).set(userCredentials)
    })
    //get token
    .then(() => {
        return res.status(201).json({token})
    })
    //catch error
    .catch((err=> {
        
        return res.status(400).json(err.message)
    }))

    // firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
    // .then((data) => {
    //     return res.status(201).json({message: `user with the id ${data.user.uid} is created successfully`})
    // } )
    // .catch((err) => {
    //     return res.status(500).json({message: `user already exist with status code ${err}`})
    // })
}


exports.login = (req, res)=>{
    const user= {
        email: req.body.email,
        password: req.body.password
    }

    const {valid, errors} = validateLoginData(user);
    if(!valid)return res.status(400).json(errors)

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
    .then((data) =>{
        return data.user.getIdToken()
    })
    .then((token) => {
        return res.json({token: token})
    })
    .catch(err=>{
        

            return res.status(500).json({error:err.message})
        
    })

}

// add userData to

exports.addUserData = (req, res) => {
    let userData = useReducedUser(req.body)

    db.doc(`/users/${req.user.username}`).update(userData)
    .then(() =>{
        return res.status(200).json({message: 'User data added successfully'})
    })
    .catch(err => {
        console.error(err.code)
        return res.status(500).json({errorMessage: err.message})
    })
}


// user profile image upload

exports.uploadImage = (req, res) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');
  
    const busboy = new BusBoy({ headers: req.headers });
  
    let imageToBeUploaded = {};
    let imageFileName;
  
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      console.log("yout busboy",fieldname, file, filename, encoding, mimetype);
      if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
        return res.status(400).json({ error: 'Wrong file type submitted' });
      }
      // my.image.png => ['my', 'image', 'png']
      const imageExtension = filename.split('.')[filename.split('.').length - 1];
      // 32756238461724837.png
      imageFileName = `${Math.round(
        Math.random() * 1000000000000
      ).toString()}.${imageExtension}`;
    // imageFileName = `${path.basename(fieldname)}.${imageExtension}`
    console.log("file nameee", imageFileName);
      const filepath = path.join(os.tmpdir(), imageFileName);
      imageToBeUploaded = { filepath, mimetype };
      console.log("image dataaa", imageToBeUploaded)
      file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on('finish', () => {
      admin
        .storage()
        .bucket('fir-test-b29f1.appspot.com')
        .upload(imageToBeUploaded.filepath, {
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageToBeUploaded.mimetype
            }
          }
        })
        .then(() => {
          const imageUrl = `https://firebasestorage.googleapis.com/v0/b/fir-test-b29f1.appspot.com/o/${imageFileName}?alt=media`;
          return db.doc(`/users/${req.user.username}`).update({ imageUrl });
        })
        .then(() => {
          return res.json({ message: 'image uploaded successfully' });
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).json({ error: 'something went wrong' });
        });
    });
    busboy.end(req.rawBody);
  };



  // get getUserCredentials

  exports.getUserCredentials = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.user.username}`).get()
    .then(doc=> {
      if(doc.exists){
        userData.credentials = doc.data();
        return db.collection('likes').where('username', '==', req.user.username).get()
      }
    })
    .then(data=>{
      userData.likes = []
      data.forEach((doc)=>{userData.likes.push(doc.data())})
      // return res.status(200).json(userData)
      return db.collection('notifications').where('recepient', '==', req.user.username)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get()
    })
    .then((data)=>{
      userData.notifications = []
      data.forEach((doc)=>{
        userData.notifications.push({
          recepient:doc.data().recepient,
          sender:doc.data().sender,
          createdAt:doc.data().createdAt,
          type:doc.data().recepient,
          read:doc.data().read,
          notificationId: doc.id
        })
      })
      return res.status(200).json(userData)
    })
    .catch(err=>{
      console.log(err)
      res.status(500).json({likesError:err.code})
    })
  }



  exports.getAnyUserDetails = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.params.username}`).get()
    .then(doc=>{
      if(doc.exists){
        userData.user = doc.data()
        return db.collection('posts').where('username', '==', req.params.username)
        .orderBy('createdAt', 'desc')
        .get()
      }
      else {
        return res.status(404).json({noUserFound: "There is no user against your query"})
      }
    })
    .then(data=>{
      userData.posts = []
      data.forEach(doc=>{
        userData.posts.push({
          body: doc.data().body,
          title: doc.data().title,
          createdAt: doc.data().createdAt,
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount,
          username: doc.data().username,
          imageUrl: doc.data().imageUrl,
          postId: doc.id
        })
      })
      return res.status(200).json(userData)
    })
    .catch(err=>{
      console.log(err)
      return res.status(500).json({anyUserDataError: err})
    })
  }


  exports.markNotificationsRead = (req, res) => {
    let batch = db.batch();
    req.body.forEach(notificationId=> {
      const notification = db.doc(`/notifications/${notificationId}`)
      batch.update(notification, {read: true})
    })
    batch.commit().then(()=> res.status(200).json({notificationRead: "notificationRead"}))
    .catch(err=> {
      console.log(err)
      res.json({notificationError: " notification error "})
    })
      

  }