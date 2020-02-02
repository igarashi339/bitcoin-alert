const functions = require('firebase-functions');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

const request = require('request');
const nodemailer = require('nodemailer');
const gmailEmail = functions.config().gmail.email
const gmailPassword = functions.config().gmail.password
const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  port: 46,
  secure: true,
  auth: {
    user: gmailEmail,
    pass: gmailPassword
  }
});
exports.get = functions.pubsub.schedule('every 1 minutes').timeZone('Asia/Tokyo').onRun((context) => {
  console.log('ビットコイン価格取得開始')
  const url = 'https://bitflyer.com/api/echo/price';
  request(url, (err, response, payload) => {
    console.log(payload);

    console.log('メール送信開始')
    let email = {
      from: gmailEmail,
      to: gmailEmail,
      subject: 'メール送信テスト',
      text: payload.mid
    }
    mailTransport.sendMail(email, (err, info) => {
      if (err) {
        return console.log(err)
      }
      return console.log('メール送信終了');
    })
  })
  console.log('ビットコイン価格取得終了')
  return null;
});