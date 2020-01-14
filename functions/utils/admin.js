const admin = require('firebase-admin')

const serviceAccount = require("../fir-test-b29f1-firebase-adminsdk-8g15w-cc4b222140.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })

  const db = admin.firestore()

module.exports = {admin, db}