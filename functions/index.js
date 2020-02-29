const functions = require('firebase-functions');
const fetch = require('node-fetch')
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

メール送信関数
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

// ビットコインの価格を取得する関数
// 本当は毎分実行するやつにするけど、とりあえず任意のタイミングでやるやつで作成
// exports.getBtc = functions.pubsub.schedule('every 1 minutes').timeZone('Asia/Tokyo').onRun((context) => {
exports.getBtc = functions.https.onCall((data, context) => {

  // 叩くapi
  const url = 'https://api.cryptowat.ch/markets/bitflyer/btcfxjpy/ohlc';

  // Unix timestampを取得する
  const date = new Date();
  const timestamp = Math.round((date.getTime() / 1000));

  // パラメータを付与
  const urlWithParam = url + '?after=' + timestamp + '&periods=' + 900;

  // 実行
  const result = (async () => {
    try {
      const response = await fetch(urlWithParam);
      const json = await response.json();
      return json;
    } catch (error) {
      console.log(error);
    }
  })();

  return result;

});