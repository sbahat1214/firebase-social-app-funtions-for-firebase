const {db} =require('../utils/admin')

exports.getAllPosts = (req, res) => {
    db.collection('posts').orderBy('createdAt', 'desc')
    .get().then((data) => {
        let posts = [];
        data.forEach((doc)=> {
          // console.log("my test doc dtaaaa",doc.data())
            posts.push({
              postId: doc.id,
              username: doc.data().username,
              imageUrl: doc.data().imageUrl,
              body: doc.data().body,
              commentCount: doc.data().commentCount,
              createdAt: doc.data().createdAt,
              title: doc.data().title,
              likeCount: doc.data().likeCount
            })
        })
        return res.json(posts)
    })
    .catch((err) =>console.error(err))
}


exports.postOnePost = (req, res) => {
    

    const newPost = {
        title: req.body.title,
        body: req.body.body,
        username: req.user.username,
        imageUrl: req.user.imageUrl,
        // we can use this
        // createdAt: admin.firestore.Timestamp.fromDate(new Date())
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0
    };
    if (req.body.body.trim() === '') {
        return res.status(400).json({ body: 'Body must not be empty' });
      }
   db.collection('posts')
    .add(newPost)
    .then((doc)=>{
      const resPost = newPost
      resPost.postId = doc.id
        return res.json(newPost)
    })
    .catch((err) => {
        res.status(500).json({message: "something went wrong"})
        console.error(err)
    })
}


exports.getPostComment = (req, res) => {
    let postData = {}
    db.doc(`/posts/${req.params.postId}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({errorPostData: 'Post not exists'})
      }
      postData = doc.data()
      postData.postId = doc.id
      return db.collection('comments').orderBy('createdAt', 'desc').where('postId', '==', req.params.postId).get()
    })
    .then(data=>{
      postData.comments = []
      data.forEach(doc => {
        postData.comments.push(doc.data())
      })
      return res.json(postData)
    })
    .catch ( err => res.status(500).json({gettingCommentsError: err.message}))
  }

  exports.postCommentOnPost = (req,res) => {
    if(req.body.body.trim() === ''){
        return res.status(400).json({noCommentError: 'Must not be blank'})
    }

    const newComment = {
        body: req.body.body,
        username: req.user.username,
        imageUrl: req.user.imageUrl,
        createdAt: new Date().toISOString(),
        postId: req.params.postId
    }

    console.log("my comment",newComment)

    db.doc(`/posts/${req.params.postId}`).get()
    .then(doc => {
        if(!doc.exists) return res.status(400).json({postNotFound: 'Post not found'})
        return doc.ref.update({commentCount: doc.data().commentCount + 1})
    })
    .then(()=> db.collection('comments').add(newComment))
    .then(()=> res.status(200).json(newComment))
    .catch(err => {
      console.log("my error cant add comment",err)
      res.status(500).json({commentError:"you can't comment"})})
}


exports.likePost = (req,res) => {
  const likeDocument = db.collection('likes').where('username', '==', req.user.username)
  .where('postId','==', req.params.postId).limit(1)

  const postDocument = db.doc(`/posts/${req.params.postId}`)

  let postData;

  postDocument.get()
  .then(doc=> {
    if(doc.exists){
      postData = doc.data()
      postData.postId = doc.id

      return likeDocument.get()
    }
    else res.status(404).json({postError: 'no post found'})
  })

  .then((data)=> {
    if(data.empty){
      return db.collection('likes')
      .add({
        postId : req.params.postId,
        username: req.user.username
      })
      .then(()=> {
        postData.likeCount++
        return postDocument.update({likeCount: postData.likeCount})
      })
      // console.log("my test postDatahere",postData)
      .then(()=>{
        return res.json(postData)})
    }
    else {
      return res.json({alreadtLiked: 'post already likes'})
    }
  })
  .catch(err=> {return res.status(500).json(err)})
}
exports.unLikePost = (req,res) => {
  const likeDocument = db.collection('likes').where('username', '==', req.user.username)
  .where('postId','==', req.params.postId).limit(1)

  const postDocument = db.doc(`/posts/${req.params.postId}`)

  let postData;

  postDocument.get()
  .then(doc=> {
    if(doc.exists){
      postData = doc.data()
      postData.postId = doc.id

      return likeDocument.get()
    }
    else res.status(404).json({postError: 'no post found'})
  })

  .then((data)=> {
    if(data.empty){

      return res.json({alreadtLiked: 'post Not liked'})
      
    }
    else {
      db.doc(`/likes/${data.docs[0].id}`).delete()
      .then(()=> {
        postData.likeCount--
        return postDocument.update({likeCount: postData.likeCount})
      })
      .then(()=>{
        return res.json(postData)})
    }
  })
  .catch(err=> {return res.status(500).json(err)})
}

exports.deletePost = (req, res) => {
  const documentToBeDelete = db.doc(`/posts/${req.params.postId}`)

  documentToBeDelete.get()
  .then(doc=>{
    if(!doc.exists){
      return res.status(404).json({NoPostFound:"no Post Found"})
    }
    if(doc.data().username!==req.user.username){
      return res.status(403).json({unauthorized:'unauthorized to perfom this actions'})
    }
    else {
      documentToBeDelete.delete()
    }
  })
  .then(()=>{
    res.status(200).json({Success:'post deleted successfully'})
  })
  .catch(err=>{
    return res.status(500).json({deleteError: "something went wrong while deleting the post"})
  })
}