# robopro_finalProject
ロボットプログラミングの最終課題

## 作成したものについて
今回はmicrobitの温度センサーで取得した値をbluetoothで接続したLINEをインストール済みのスマホで受け取り、データベースに蓄積する。

## 動作環境
heroku上で実行している。```requirements.txt```にインストールするpythonのライブラリを記載した。

## 友だち追加
スマホで以下のQRコードを読み取り友達追加する。

![QR](https://qr-official.line.me/sid/M/359hcexg.png)

## micro:bitの設定
```firmware``` フォルダのREADMEを参考にし、Arduino上でmicro:bitを実行できる環境を構築する。その後、```arduino```フォルダにあるファームウェアを書き込む。


## LINEアプリ上で接続
以下のQRコードを使用し、連携画面を立ち上げて規約に同意した後、表示されているデバイス名をタップして接続を行う。

![qrcode_201908060804](https://user-images.githubusercontent.com/24681988/62500367-fe836900-b820-11e9-8ee8-4123c1143cdd.png)

## 実行動画
下記のリンクの動画で実際の動作を示す。

https://www.youtube.com/watch?v=p7xShuX-45Y
