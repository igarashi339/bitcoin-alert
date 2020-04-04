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

// 前回ツイート時との価格差をツイートする関数
exports.getDiff = functions.region('asia-northeast1').pubsub.schedule('00 8,18 * * *').timeZone('Asia/Tokyo').onRun(async (context) => {

  // 叩くapi
  const url = 'https://api.cryptowat.ch/markets/bitflyer/btcjpy/ohlc';

  // Unix timestampを取得する
  let now = new Date();
  const timestamp = Math.round((now.getTime() / 1000));
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

  // 日時フォーマット
  now.setTime(now.getTime() + 1000 * 60 * 60 * 9);
  const jpDate = now.toLocaleDateString();
  const jpTime = now.toLocaleTimeString().substring(0, 5);

  // 前回ツイート時の価格が入っている配列の添字を取得
  const index = now.toLocaleTimeString().substring(0, 2) === '08'
    ? 14
    : 10;

  // 価格差を計算
  const openPrice = result.result['3600'][0][4];
  const closePrice = result.result['3600'][index][4];
  const diff = closePrice - openPrice;
  // 小数第3位を四捨五入
  const ratio = Math.round((closePrice / openPrice * 100 - 100) * 100) / 100;
  const prefix = ratio > 0 ? '+' : '';

  // ツイートする内容
  const text = `${jpDate} ${jpTime}の価格は${closePrice.toLocaleString()}円です。前回ツイート時との価格差は${diff.toLocaleString()}円（${prefix}${ratio}%）です。`
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

  return { data: result, text: text };
});