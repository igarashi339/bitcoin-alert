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

// 前日との価格差を取得してツイートする関数
exports.getDiff = functions.region('asia-northeast1').pubsub.schedule('00 00 * * *').timeZone('Asia/Tokyo').onRun(async (context) => {

  // 叩くapi
  const url = 'https://api.cryptowat.ch/markets/bitflyer/btcjpy/ohlc';

  // Unix timestampを取得する
  const date = new Date();
  const timestamp = Math.round((date.getTime() / 1000));
  const after = timestamp - 86400 - 3600;

  // パラメータを付与
  const urlWithParam = url + '?after=' + after + '&periods=' + 3600;

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
  const openPrice = result.result['3600'][0][4];
  const closePrice = result.result['3600'][24][4];
  const diff = closePrice - openPrice;
  // 小数第3位を四捨五入
  const ratio = Math.round((closePrice / openPrice * 100 - 100) * 100) / 100;
  const prefix = ratio > 0 ? '+' : '';

  const text = `${date.toLocaleDateString()}の価格は${closePrice}円でした。前日との価格差は${diff}円（${prefix + ratio}%）でした。`
  // ツイート
  client.post('statuses/update', { status: text }, function (error, tweet, response) {
    if (!error) {
      console.log(tweet);
    }
  });

  return { data: result, text: text };
});