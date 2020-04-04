const functions = require('firebase-functions');
const fetch = require('node-fetch');
const twitter = require('twitter');
const fs = require('fs');
const admin = require('firebase-admin');

// Cloud Frestoreの初期化
admin.initializeApp(functions.config().firebase);
const db = admin.firestore();

// twitterオブジェクトの生成
const client = new twitter(
  JSON.parse(fs.readFileSync('config.json', 'utf-8'))
);

// ビットコインの価格の急落（10%以上の値下がり）を検知したらツイートする関数
// 本当は毎分実行するやつにするけど、とりあえず任意のタイミングでやるやつで作成
// exports.alert = functions.region('asia-northeast1').pubsub.schedule('every 1 minutes').timeZone('Asia/Tokyo').onRun(async (context) => {
exports.alert = functions.region('asia-northeast1').https.onCall(async (data, context) => {

  // 叩くapi
  const url = 'https://api.cryptowat.ch/markets/bitflyer/btcfxjpy/ohlc';

  // Unix timestampを取得する
  const date = new Date();
  const timestamp = Math.round((date.getTime() / 1000));
  const after = timestamp - 900;

  // パラメータを付与
  const urlWithParam = url + '?after=' + after + '&periods=' + 60;

  // 実行
  const result = await (async () => {
    try {
      const response = await fetch(urlWithParam);
      const json = await response.json();
      return json;
    } catch (error) {
      console.log(error);
    }
  })();

  const prices = result.result['60'].filter((v, index) => index !== 15);

  const max = Math.max.apply(null, prices.map(v => v[2]));
  const min = Math.min.apply(null, prices.map(v => v[3]));
  const decline = (max - min) / max * 100;
  const threshold = 15;

  // 価格が急落していたら、ツイートする
  if (decline > threshold) {
    const text = '急落';
    client.post('statuses/update', { status: text }, function (error, tweet, response) {
      if (!error) {
        console.log(tweet);
      }
    });
  }

  return result;
});

// 前回ツイート時との価格差をツイートする関数
exports.getDiff = functions.region('asia-northeast1').pubsub.schedule('00 8,18 * * *').timeZone('Asia/Tokyo').onRun(async (context) => {

  // 叩くapi
  const url = 'https://api.cryptowat.ch/markets/bitflyer/btcjpy/price';

  // 実行
  const result = await (async () => {
    try {
      const response = await fetch(url);
      const json = await response.json();
      return json;
    } catch (error) {
      console.log(error);
    }
  })();

  // 現在の価格
  const price = result.result.price;

  // 前回ツイート時の価格をFirestoreから取得
  const docRef = db.collection('tweet').doc('prevPrice');
  const snapshot = await docRef.get();
  const prevPrice = snapshot.data().price;

  // Firostoreの価格を更新
  await docRef.set({ price: price });

  // 価格差を計算
  const diff = price - prevPrice;
  const ratio = Math.round(diff / prevPrice * 100 * 100) / 100;
  const prefix = ratio > 0 ? '+' : '';

  // 日時フォーマット
  let now = new Date();
  now.setTime(now.getTime() + 1000 * 60 * 60 * 9);
  const jpDate = now.toLocaleDateString();
  const jpTime = now.toLocaleTimeString().substring(0, 5);

  // ツイート本文
  const text = `${jpDate} ${jpTime}の価格は${price.toLocaleString()}円です。前回ツイート時との価格差は${diff.toLocaleString()}円（${prefix}${ratio}%）です。`;
  // ハッシュタグ
  const tags = [
    '#bitcoin',
    '#btc',
    '#ビットコイン'
  ];
  const content = text + tags.reduce((acc, cur) => acc + ' ' + cur, '');

  // ツイート
  client.post('statuses/update', { status: content }, function (error, tweet, response) {
    if (!error) {
      console.log(tweet);
    }
  });

  return null;
});