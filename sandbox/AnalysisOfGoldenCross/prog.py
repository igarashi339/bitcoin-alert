'''
cryptowatのAPIを用いて現在までのBitcoinの価格を取得し、CSVファイルに吐き出す。
ドキュメント：https://docs.cryptowat.ch/rest-api/
'''

import requests
import json
import codecs
import copy
import pprint

class PriceInfo:
    '''
    Bitcoin価格情報を表すクラス
    '''
    def __init__(self, unixtime, price):
        self.unixtime = unixtime 
        self.price    = price # JPY

class MeanAverageLine():
    '''
    Bitcoinの平均移動線を表すクラス
    '''
    def __init__(self, price_list):
        self.price_list = copy.deepcopy(price_list)
        self.mean_average_map = {}
    
    def calcMeanAverageList(self, mean_unit):
        '''
        移動平均線を計算する.

        Parameter
        ---------
        mean_unit : int
          移動平均線を計算する際の幅.
          例えば10が指定された場合、price_listの連続した10要素が平均をとる対象となる.
        '''
        if self.price_list == []:
            print("error: calcMeanAverageList : price_list is empty!")
            exit(1)
        for i in range(len(self.price_list)):
            if i < mean_unit - 1:
                continue
            sum = 0
            for j in range(i - mean_unit, i, 1):
                sum += self.price_list[j + 1].price
            unixtime = self.price_list[i].unixtime
            self.mean_average_map[unixtime] = int(sum/mean_unit)
        
    def getMeanAverageValue(self, targe_unixtime):
        '''
        ある時刻における移動平均線の値を取得する.
        先に calcMeanAverageList を呼んでおく必要がある.
        '''
        if self.price_list == []:
            print("error: getMeanAverageValue : price_list is empty!")
            exit(1)
        if self.mean_average_map == {}:
            print("error: getMeanAverageValue : mean_average_list is empty!")
            exit(1)
        if not self.mean_average_map.get(targe_unixtime):
            return -1
        return self.mean_average_map[targe_unixtime]


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
        unixtime = int(splited_line[0])
        price    = int(splited_line[1])
        price_info = PriceInfo(unixtime, price)
        price_list.append(price_info)
    return price_list

def getAnalysisData(file_path):
    '''
    分析対象のデータ(2018/4/1~2020/4/1のBTC価格)を取得してファイルに吐き出す.

    Parameter
    ---------
    file_path : str
      出力対象ファイルパス
    '''
     # BTC価格取得
    after   = 1522508400 # 2018/4/1 00:00:00
    before  = 1585666800 # 2020/4/1 00:00:00
    periods = 3600 # [s] = 1[h]
    price_list = getBitcoinPrice(after, before, periods)

    # 出力
    writePriceInfo(file_path, price_list)

def similate(long_mean_unit, short_mean_unit, price_list):
    '''
    ゴールデンクロス分析に基づいて売買をシミュレートし、最終的な損益を計算する.

    Parameters
    ----------
    long_mean_unit : int
      長期移動平均線の平均幅. 単位はprice_listの配列1つ分.
    short_mean_unit : int
      短期平均移動線の平均幅. 単位はprice_listの配列1つ分.
    price_list : array-like(PriceInfo)
      BTCの価格情報オブジェクトの配列
    '''
    long_mean_average = MeanAverageLine(price_list)
    long_mean_average.calcMeanAverageList(long_mean_unit)
    short_mean_average = MeanAverageLine(price_list)
    short_mean_average.calcMeanAverageList(short_mean_unit)

    # unixtime -> BTC価格 の辞書を作成
    price_map = {}
    for i in price_list:
        price_map[i.unixtime] = i.price
    
    long_above_flag = False # 長期移動線が上にある場合True
    btc_balance = 0 #[BTC] btc残高.
    jpy_balance = 0 #[円] 日本円残高.
    for i in range(len(price_list)):
        unixtime = price_list[i].unixtime
        if not long_mean_average.mean_average_map.get(unixtime):
            continue
        if not short_mean_average.mean_average_map.get(unixtime):
            continue
        long_mean_average_value = long_mean_average.mean_average_map[unixtime]   # 長期平均
        short_mean_average_value = short_mean_average.mean_average_map[unixtime] # 短期平均

        # 移動平均線の初期化
        if i == 0:
            long_above_flag = long_mean_average_value > short_mean_average_value

        # for debug
        # print(str(unixtime)+"\t"+str(price_list[i].price)+"\t"+str(long_mean_average_value)+"\t"+str(short_mean_average_value))

        # ゴールデンクロス
        if long_above_flag and (short_mean_average_value > long_mean_average_value):
            # 1BTC購入する
            btc_balance += 1
            jpy_balance -= price_map[unixtime]
            long_above_flag = False
            # print(str(unixtime) + ": Gクロス 購入 : JPY残高="+str(jpy_balance) + ", BTC残高=" + str(btc_balance))
        
        # デッドクロス
        if (long_above_flag == False) and (long_mean_average_value > short_mean_average_value):
            # 1BTC売却する
            btc_balance -= 1
            jpy_balance += price_map[unixtime]
            long_above_flag = True
            # print(str(unixtime) + ": Dクロス 売却 : JPY残高="+str(jpy_balance) + ", BTC残高=" + str(btc_balance))
    
    # 精算する
    unixtime = price_list[-1].unixtime
    return jpy_balance + (price_map[unixtime] * btc_balance)

if __name__=="__main__":
    file_path = "data/prices.csv"
    # getAnalysisData(file_path) # => 1回実行すればOK
    price_list = readPriceInfo(file_path)
    unit_list = [1*24, 5*24, 10*24, 15*24, 20*24, 30*24, 40*24, 50*24]
    for s in range(len(unit_list)):
        for l in range(len(unit_list)):
            if s >= l :
                continue
            result =  similate(unit_list[l], unit_list[s], price_list)
            print(int(unit_list[s]/24), int(unit_list[l]/24), result)