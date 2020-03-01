# coding: UTF-8
'''
下記のブログを参考に実装。
https://karupoimou.hatenablog.com/entry/2019/05/16/080343
'''

import tweepy
import json

# KEYの指定
with open('../config.json') as f:
    config = json.load(f)
    CONSUMER_KEY        = config["api_key"]
    CONSUMER_SECRET     = config["api_secret_key"]
    ACCESS_TOKEN        = config["access_token"]
    ACCESS_TOKEN_SECRET = config["access_token_secret"]

# tweepyの設定
auth = tweepy.OAuthHandler(CONSUMER_KEY, CONSUMER_SECRET)
auth.set_access_token(ACCESS_TOKEN, ACCESS_TOKEN_SECRET)
api = tweepy.API(auth)

# ツイートの実行
api.update_status("テストコード2")

'''
# おまけ1. タイムラインのツイートの取得
public_tweets = api.home_timeline()
for tweet in public_tweets:
    print(tweet.text)

# おまけ2. 他人のタイムラインの取得
user_timeline = api.user_timeline("hiko_74")
for tweet in user_timeline:
    print(tweet.text)
'''