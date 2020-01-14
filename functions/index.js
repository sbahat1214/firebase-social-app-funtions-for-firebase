const functions = require('firebase-functions');
const app = require('express')()
const FBAuth = require('./utils/FBAuth')
const {db} = require('./utils/admin')

// const {db} = require('./utils/admin')

const {getAllPosts, 
    postOnePost,
    getPostComment, 
    postCommentOnPost,
likePost,
unLikePost,
deletePost}
     = require('./handlers/posts')

const {signup, 
        login, 
        uploadImage, 
        addUserData, 
        getUserCredentials, 
        getAnyUserDetails,
        markNotificationsRead
       }
        = require('./handlers/users')




// start your app from here

app.get("/hello-world", (req, res) => {
    res.send("Hello from Firebase!");
})
// get your firestore data

app.get('/posts', getAllPosts)


// protected Routes



// post new data to firestore

app.post('/post',FBAuth, postOnePost)

// helper methods for validation



// signUp route



// const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;


app.post('/sign-up', signup)




// login endpoint

app.post('/login', login)


// upload user profile image

app.post('/user/image', FBAuth, uploadImage);

app.post('/user', FBAuth, addUserData)

app.get('/user', FBAuth, getUserCredentials)

app.get('/user/:username', getAnyUserDetails)

app.post('/notifications', FBAuth, markNotificationsRead)

app.get('/post/:postId', getPostComment)

app.post('/post/:postId/comment',FBAuth, postCommentOnPost)

app.get('/post/:postId/like',FBAuth, likePost)

app.get('/post/:postId/unlike',FBAuth, unLikePost)

app.delete('/post/:postId',FBAuth, deletePost)

// base Url


exports.api = functions.https.onRequest(app)
//use of region
// exports.api = functions.region('europe-west1').https.onRequest(app)


exports.createNotificationOnLike = functions.firestore.document(`likes/{id}`)
.onCreate(snapshot=>{
    return db.doc(`/posts/${snapshot.data().postId}`)
    .get()
    .then((doc)=>{
        if(doc.exists && doc.data().username !== snapshot.data().username){
            return db.doc(`/notifications/${snapshot.id}`).set({
                createdAt: new Date().toISOString(),
                recepient: doc.data().username,
                sender: snapshot.data().username,
                type: 'like',
                read:'false',
                postId: doc.id
            })
            
            .catch(err=>{
                console.error(err)
                return;
            })
        }
    })
})
exports.createNotificationOnComment = functions.firestore.document('comments/{id}')
.onCreate(snapshot=>{
    // let commentNotification;
    return db.doc(`/posts/${snapshot.data().postId}`)
    .get()
    .then((doc)=>{
        if(doc.exists && doc.data().username !== snapshot.data().username){
            return db.doc(`/notifications/${snapshot.id}`).set({
                createdAt: new Date().toISOString(),
                recepient: doc.data().username,
                sender: snapshot.data().username,
                type: 'comment',
                read:'false',
                postId: doc.id
            })
            // console.log(commentNotification)
            // return commentNotification
            
            .catch(err=>{
                console.error(err)
                return;
            })
        }
    })
})

exports.deleteNotificationOnUnlike = functions.firestore.document(`likes/{id}`)
.onDelete((snapshot)=>{
    return db.doc(`/notifications/${snapshot.id}`)
    .delete()
    
    .catch((err)=>{
        console.error(err)
        return
    })
})

exports.onImageChange = functions.firestore.document(`/users/{userId}`)
.onUpdate((change)=>{
    if(change.before.data().imageUrl !== change.after.data().imageUrl){
        let batch = db.batch()
        db.collection('posts')
        .where('username', '==', change.before.data().username)
        .get()
        .then((data)=>{
            data.forEach((doc)=>{
                const post = db.doc(`/posts/${doc.id}`)
                batch.update(post, {imageUrl: change.after.data().imageUrl})
            })
            return batch.commit()
        })
    }else return true;
})

exports.onPostDelete = functions.firestore.document(`/posts/{postId}`)
.onDelete((snapshot, context)=>{
    const postId = context.params.postId;
    const batch = db.batch()
    return db.collection('comments').where('postId', '==', postId).get()
    .then((data)=>{
        data.forEach(doc=>{
            batch.delete(db.doc(`/comments/${doc.id}`))
        })
        return db.collection('likes').where('postId', '==', postId).get()
    })
    .then((data)=>{
        data.forEach((doc)=>{
            batch.delete(db.doc(`/likes/${doc.id}`))
        })
        return db.collection('notifications').where('postId', '==', postId).get()
    })
    .then(data=>{
        data.forEach(doc=>{
            batch.delete(db.doc(`/notifications/${doc.id}`))
        })
        return batch.commit()
    })
    .catch(err=>{
        console.log("post delete error",err)

    })
})