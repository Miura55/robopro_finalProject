from flask import Flask, request, abort, render_template
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import datetime as dt
import os
import json
import base64
import urllib.parse
import requests

from linebot import (
    LineBotApi, WebhookParser
)
from linebot.exceptions import (
    InvalidSignatureError
)
from linebot.models import (
    MessageEvent, TextMessage, TextSendMessage,
)

CHANNEL_ACCESS_TOKEN = os.environ.get('CHANNEL_ACCESS_TOKEN')
CHANNEL_SECRET = os.environ.get('CHANNEL_SECRET')

line_bot_api = LineBotApi(CHANNEL_ACCESS_TOKEN)
parser = WebhookParser(CHANNEL_SECRET)

app = Flask(__name__, static_folder='static')

# DBを定義
db_uri = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
db = SQLAlchemy(app)

class User(db.Model):
    __tablename__ = 'userdatas'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=False)
    temperature = db.Column(db.Integer)
    save_date = db.Column(db.DateTime, nullable=False, default=datetime.now)

    def __init__(self, username, heart_rate, save_date):
        self.username = username
        self.heart_rate = heart_rate
        self.save_date = save_date

    def __repr__(self):
        return '<User %r>' % self.username

@app.route('/')
def do_get():
    return render_template('index.html')

@app.route("/callback", methods=['POST'])
def callback():
    signature = request.headers['X-Line-Signature']

    # get request body as text
    body = request.get_data(as_text=True)
    print("Request body: " + body)

    try:
        for event in parser.parse(body, signature):
            handle_message(event)

        # Parse JSON without SDK for LINE Things event
        events = json.loads(body)
        for event in events["events"]:
            if "things" in event:
                handle_things_event(event)
    except InvalidSignatureError:
        print("Invalid signature. Please check your channel access token/channel secret.")
        abort(400)

    return 'OK'

def handle_things_event(event):
    if event["things"]["type"] != "scenarioResult":
        return
    if event["things"]["result"]["resultCode"] != "success":
        app.logger.warn("Error result: %s", event)
        return

    username = event["source"]["userId"]
    heart_rate = int.from_bytes(base64.b64decode(event["things"]["result"]["bleNotificationPayload"]), 'little')
    save_date = datetime.now()

    print("Got data: " + str(heart_rate))
    if heart_rate > 0:
        user = User(username, heart_rate, save_date)
        db.session.add(user)
        db.session.commit()

def handle_message(event):
    if event.type == "message" and event.message.type == "text":
        if event.message.text == "今の温度":
            before_10s = datetime.now() - dt.timedelta(seconds=10)
            userId = event.source.sender_id
            users = db.session.query(User).filter(User.save_date>=before_10s).filter(User.username==userId).all()
            list_heart = [int(data.heart_rate) for data in users]
            try:
                av_heart = sum(list_heart) / len(list_heart)
                message = "現在の温度: " + str(av_heart)
            except ZeroDivisionError:
                message = "デバイスの接続がありません。"
        else:
            message = event.message.text
        line_bot_api.reply_message(event.reply_token,
            TextSendMessage(text=message))

if __name__ == "__main__":
    app.debug = True
    app.run()