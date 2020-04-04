'''
cryptowatのAPIを用いて現在までのBitcoinの価格を取得し、CSVファイルに吐き出す。
ドキュメント：https://docs.cryptowat.ch/rest-api/
'''

import requests
import json
import codecs

class PriceInfo:
    '''
    Bitcoin価格情報を表すクラス
    '''
    def __init__(self, unixtime, price):
        self.unixtime = unixtime 
        self.price    = price # JPY

def getBitcoinPrice(after, before, periods):
    '''
    UnixTimeを指定してその時の価格を取得する.

    Parameter
    ---------
    after : int
      Bitcoin価格取得開始時刻(UnixTime)
    before : int
      Bitcoin価格取得終了時刻(UnixTime)
    periods : int
      Bitcoin価格を取得する周期[s]

    Returns
    -------
    price_list : array-like(PriceInfo)
    　afterからbeforeまでのBitcoin価格情報リスト
    '''

    # 価格取得
    url = "https://api.cryptowat.ch/markets/bitflyer/btcjpy/ohlc"
    params = {
        "before"  : before,
        "after"   : after,
        "periods" : periods
    }
    json_data = requests.get(url, params=params).json()

    # 取得した価格情報の整形
    unixtime_index   = 0 # unixitimeのインデクス
    close_price_index = 4 # ローソク足における「終値」のインデクス
    price_list = []
    for data in json_data["result"][str(periods)]:
        unixtime = data[unixtime_index]
        price    = data[close_price_index]
        price_info = PriceInfo(unixtime, price)
        price_list.append(price_info)
    return price_list

def writePriceInfo(file_path, price_list):
    '''
    指定されたファイルにPriceInfoクラスのリストを出力する

    Parameters
    ----------
    file_path : str
      出力先のファイルパス.
    price_list : array-like(PriceInfo)
      出力対象のPriceInfoリスト
    '''
    ofs = codecs.open(file_path, "w", "utf-8")
    ofs.write("unixtime,price\n")
    for price_info in price_list:
        unixtime = price_info.unixtime
        price    = price_info.price
        ofs.write(str(unixtime)+","+str(price)+"\n")

def readPriceInfo(file_path):
    '''
    指定されたファイルからPriceInfoクラスのリストを読み込む.
    
    Parameter
    ---------
    file_path : str
      読み込み対象ファイルパス

    Returns
    -------
    price_list : array-like(PriceInfo)
      読み込んだPriceInfoのリスト
    '''
    ifs = codecs.open(file_path, "r", "utf-8")
    next(ifs) # 見出し行はとばす
    contents = ifs.read()
    price_list = []
    for line in contents.splitlines():
        splited_line = line.split(",")
        unixtime = splited_line[0]
        price    = splited_line[1]
        price_info = PriceInfo(unixtime, price)
        price_list.append(price_info)
    return price_list

def getAnalysisData():
    '''
    分析対象のデータ(2018/4/1~2020/4/1のBTC価格)を取得してファイルに吐き出す.
    '''
     # BTC価格取得
    after   = 1522508400 # 2018/4/1 00:00:00
    before  = 1585666800 # 2020/4/1 00:00:00
    periods = 3600 # [s] = 1[h]
    price_list = getBitcoinPrice(after, before, periods)

    # 出力
    writePriceInfo("data/prices.csv", price_list)

if __name__=="__main__":
    # getAnalysisData() # => 1回実行すればOK