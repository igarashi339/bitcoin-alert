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

// ビットコインの価格の急落（15分以内に10％以上の値下がり）を検知したらツイートする関数
exports.alert = functions.region('asia-northeast1').pubsub.schedule('every 1 minutes').timeZone('Asia/Tokyo').onRun(async (context) => {

  // 叩くapi
  const url = 'https://api.cryptowat.ch/markets/bitflyer/btcjpy/ohlc';

  // Unix timestampを取得する
  let now = new Date();
  const timestamp = Math.round((now.getTime() / 1000));

  // アラートを出してから15分経過していなければ何もしない
  const docRef = db.collection('alert').doc('lastTweet');
  const snapshot = await docRef.get();
  const timestamps = snapshot.data().timestamps;
  const lastTimestamp = timestamps[timestamps.length - 1];
  if (timestamp - lastTimestamp < 900) {
    return null;
  }

  // 15分前から（微調整用に少しプラス）
  const after = timestamp - 900 - 60;
  // 現在までを
  const before = timestamp;
  // 1分毎に
  const period = 60;
  // 取得する
  const urlWithParam = url + '?after=' + after + '&before' + before + '&periods=' + period;

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

  const prices = result.result['60'];
  // 現在の価格
  const priceCur = prices[prices.length - 1][4];
  // 15分間の間の最大価格
  const priceMax = Math.max.apply(null, prices.map(v => v[2]));
  // 下落率
  const decline = priceMax > priceCur ? (priceMax - priceCur) / priceMax * 100 : 0;
  // 閾値
  const threshold = 10;

  // 価格が急落していたら、ツイートする
  if (decline > threshold) {
    
    // 日時フォーマット
    now.setTime(now.getTime() + 1000 * 60 * 60 * 9);
    const jpDate = now.toLocaleDateString();
    const jpTime = now.toLocaleTimeString().substring(0, 5);

    // ツイート本文
    const text = `ビットコインの価格が急落しています！（${jpDate} ${jpTime}、${decline}%）`;
    // ハッシュタグ
    const tags = [
      '#bitcoin',
      '#btc',
      '#ビットコイン'
    ];
    const content = text + tags.reduce((acc, cur) => acc + ' ' + cur, '');

    client.post('statuses/update', { status: content }, function (error, tweet, response) {
      if (!error) {
        console.log(tweet);
      }
    });

    //アラートした時刻を更新
    await docRef.update({
      timestamps: admin.firestore.FieldValue.arrayUnion(timestamp)
    });
  }

  return null;
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