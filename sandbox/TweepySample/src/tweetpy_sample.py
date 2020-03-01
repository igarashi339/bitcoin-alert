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
api.update_status("テストコード")