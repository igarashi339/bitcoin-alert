const functions = require('firebase-functions');
const fetch = require('node-fetch');
const twitter = require('twitter');
const fs = require('fs');

// twitterオブジェクトの生成
const client = new twitter(
  JSON.parse(fs.readFileSync('config.json', 'utf-8'))
);

// ビットコインの価格の急落（10%以上の値下がり）を検知したらツイートする関数
// 本当は毎分実行するやつにするけど、とりあへず任意のタイミングでやるやつで作成
// exports.getBtc = functions.pubsub.schedule('every 1 minutes').timeZone('Asia/Tokyo').onRun((context) => {
exports.alert = functions.https.onCall(async (data, context) => {

  // 叩くapi
  const url = 'https://api.cryptowat.ch/markets/bitflyer/btcfxjpy/ohlc';

  // Unix timestampを取得する
  const date = new Date();
  const timestamp = Math.round((date.getTime() / 1000));
  const after = timestamp - 900;

  // パラメータを付与
  const urlWithParam = url + '?after=' + after + '&periods=' + 900;

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

  const highPrice = result.result['900'][2];
  const lowPrice = result.result['900'][3];
  const threshold = highPrice * 0.1;

  // 価格が急落していたら、ツイートする
  if (highPrice - lowPrice > threshold) {
    const text = '急落';
    client.post('statuses/update', { status: text }, function (error, tweet, response) {
      if (!error) {
        console.log(tweet);
      }
    });
  }

  return result;
});

// 前日との価格差を取得してツイートする関数
// 本当は毎日0:00に実行するやつにするけど、とりあへず任意のタイミングでやるやつで作成
// exports.getDiff = functions.pubsub.schedule('00 00 * * *').timeZone('Asia/Tokyo').onRun((context) => {
exports.getDiff = functions.https.onCall(async (data, context) => {

  // 叩くapi
  const url = 'https://api.cryptowat.ch/markets/bitflyer/btcfxjpy/ohlc';

  // Unix timestampを取得する
  const date = new Date();
  const timestamp = Math.round(((date.getTime() - 1000 * 60 * 60 * 24) / 1000));
  const after = timestamp - 86400;

  console.log(timestamp)

  // パラメータを付与
  const urlWithParam = url + '?after=' + after + '&periods=' + 86400;

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

  // 価格差を計算
  const text = '価格差';

  // ツイート
  client.post('statuses/update', { status: text }, function (error, tweet, response) {
    if (!error) {
      console.log(tweet);
    }
  });

  return text;
});