
require('dotenv').config();
const port = process.env.ENV_PORT || 3000,
	express = require("express"),
	app = express(),
	db = require("./db/db");
const http = require("http");
const request = require("request");
const puppeteer = require('puppeteer');
const dateFormat = require('dateformat');

// This is where we'll put the code to get around the tests.
const preparePageForTests = async (page) => {

// Pass the User-Agent Test.
const userAgent = 'Mozilla/5.0 (X11; Linux x86_64)' +
  'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36';
await page.setUserAgent(userAgent);
}

const splitDateString = (dateString => {
	let [m, d, y, time, am_pm, timezone] = dateString.split(' ');
	y = y.slice(0, -1);
	let [hh, mm] = time.split(':');
	[hh, mm] = [parseInt(hh), parseInt(mm)];
	if(am_pm == "pm") hh += 12;

	const mediumDate = [m, d + ",", y].join(" ");
	const formattedDate = dateFormat(mediumDate, "isoDate");
	const formattedTime = [hh, mm, "00"].join(":");
	const isoDateTime = [formattedDate, formattedTime].join("T");
	return [isoDateTime, timezone];
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));
// jsonを扱えるようにする
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}))
const api_url = "http://localhost:3000/contest";
const hackerrank_url = "https://www.hackerrank.com/";
var options = {
    url: api_url,
    method: 'GET',
    json: true
}
var contest = [{"contest_id":1,"contest_name":"ゆるふわ競技プログラミングオンサイト at FORCIA #2 ゴリラの挑戦状","contest_url":"yfkpo2","contest_date":"2019-09-13","writer":"prd_xxx, matsu7874"},
{"contest_id":2,"contest_name":"ゆるふわ競プロオンサイト #3 (Div. 1)","contest_url":"yfkpo3-1","contest_date":"2020-02-29","writer":"?"},
{"contest_id":3,"contest_name":"ゆるふわ競プロオンサイト #3 (Div. 2)","contest_url":"yfkpo3-2","contest_date":"2020-02-29","writer":"?"},
{"contest_id":4,"contest_name":"EEIC Programming Contest #0","contest_url":"eeic-programming-contest-0","contest_date":"2019-12-18","writer":"EmoMoegi, Mojumbo, soshun"},
{"contest_id":5,"contest_name":"EEIC Programming Contest #1","contest_url":"eeic-programming-contest-1","contest_date":"2020-05-26","writer":"dividebyzero, holeguma, Nyaan, soshun"},
{"contest_id":6,"contest_name":"EEIC Programming Contest #2","contest_url":"eeic-programming-contest-2","contest_date":"2022-02-28","writer":"EmoMoegi, Mojumbo, divideby0x00"}
];



app.get('/', async(req, res) => {
	new Promise(async(resolve, reject) => {
		await request(options, function (error, response, body) {
			//contest = response.body;
			resolve(response.body);
		});
	}).then(contest => {
		//console.log(contest.length);
		contest.sort(function(a,b) {
	    	return (a.contest_date < b.contest_date ? 1 : -1);
		});
		res.render('./index.ejs',{
				contests:contest
			});
	});
});


app.get('/new', (req, res) => {
	new Promise(async(resolve, reject) => {
		await request(options, function (error, response, body) {
			//contest = response.body;
			resolve(response.body);
		});
	}).then(contest => {
		//console.log(contest.length);
		contest.sort(function(a,b) {
			return (a.contest_id < b.contest_id ? 1 : -1);
		});
		res.render('./new.ejs',{
				contests:contest
			});
	});
});

app.get('/add', (req, res) => {
    res.render('./add.ejs');
});

app.get('/contact', (req, res) => {
    res.render('./contact.ejs');
});

app.get("/contest",async (req, res)=>{
	db.pool.connect((err, client) => {
	    if (err) {
	     	console.log(err);
	    }else{
	     	client.query('SELECT * FROM contest;', (err, result) => {
				if(err)console.log(err)
				let contest = result.rows;
				contest.forEach(item => {
					const jstDate = new Date(item["start_time"].toLocaleString({ timeZone: 'Asia/Tokyo' }));

					const [y, m, d] = [jstDate.getFullYear(), jstDate.getMonth()+1, jstDate.getDate()];
					item.start_time = [y, m, d].join('-');
				});
				//console.log(contest);
			 	res.send(contest);
	     	});
	    }
	});
});


app.post("/insert",async(req,res) =>{
	//正しいURLであるかチェックし、contest_nameとcontest_dateを取得する
	//console.log(req.body);
	//const contest_url = "yfkpo3-1";
	//const writer = "?";
	//const contest_name = "ゆるふわ競プロオンサイト #3 (Div. 1)";//取得する
	//const contest_date = "2020-02-29";//取得する
	const contest_url = req.body.contest_url;
	let writer = req.body.writer.trim().split(/\s*,\s*/);//カンマ区切りで入力されているので、配列に整形する

	const access_url = hackerrank_url + contest_url;
	new Promise(async(resolve, reject) => {
		await request({
			url: "http://localhost:3000/fetchContest",
	    	method: 'POST',
	    	json:{"url":access_url}
		}, function (error, response, body) {
			//console.log(response.body);
			resolve(response.body);
		});
	}).then(response => {
		if(response.status == false){
			console.log("fetchContestAPI失敗");
			return res.send({"message":"不正なURLが入力されました"});
		}
		const contest_name = response.contest_name;
		const start_time = response.start_time;
		const end_time = response.end_time;
		const duration = response.duration;
		//DBに接続

		db.pool.connect((err, client) => {
			if(err){
			  console.log("DB接続失敗" + err);
			}else{
				//contest_urlと等しいものがDBに存在していたらエラーを出し、そうでなければDBにinsertする
				client.query('SELECT * FROM contest WHERE contest_url = $1;',[contest_url], (err, result) => {
				if(err)console.log("select失敗" + err);
				if(result.rows.length > 0){
					//コンテストがすでに登録されているのでエラーを出す
					res.send({"message":"このコンテストはすでに登録されています"});
				}else{
					//DBにinsertする
					if(writer.length == 0 || writer[0].length == 0){
						writer = ["?"];
					}
					client.query('INSERT INTO contest (contest_name, contest_url, start_time, end_time, duration, writer)'
					+ 'VALUES ($1, $2, $3, $4, $5, $6);',
						[contest_name, contest_url, start_time, end_time, duration, writer], (err, result) => {
							if(err){
								console.log("insert失敗" + err);
							}else{
								res.send({"message":"コンテストが登録されました"});
							}
						});
					}
				});
			}
		});


	});

});


app.post("/fetchContest", (req, res) => {
	(async() => {
		//console.log(req.body); // リクエスト本文をロギング console.log(req.query);
		const url = req.body.url;
		//console.log(url);

		const browser = await puppeteer.launch();
	    const page = await browser.newPage();
		await preparePageForTests(page);
		try{
			const response = await page.goto(url); // ページへ移動

			// コンテスト名と日時を取得する
			const title = await page.evaluate(() => document.querySelector('.contest_header').children[0].firstChild.textContent.trim());
		 	let startTime = await page.evaluate(() => document.querySelector('.start-time').innerText.trim());
			let endTime = await page.evaluate(() => document.querySelector('.end-time').innerText.trim());
			browser.close();

			let startTimezone, endTimezone;
			//console.log(title, startTime, endTime);
			[startTime, startTimezone] = splitDateString(startTime);
			[endTime, endTimezone] = splitDateString(endTime);
			//console.log(startTime, endTime);

			startTimeObj = new Date(startTime.replace(/-/g, '/').replace(/T/, ' '));
			endTimeObj = new Date(endTime.replace(/-/g, '/').replace(/T/, ' '));
			//console.log(startTimeObj, endTimeObj);
			let contestDuration = Math.abs(endTimeObj - startTimeObj);//ミリ秒
			contestDuration /= 1000;//秒
			contestDuration /= 60;//分
			//console.log(contestDuration);

			// erase 'T'
			startTime = startTime.replace("T", " ") + " " + startTimezone;
			endTime = endTime.replace("T", " ") + " " + endTimezone;

			return res.send({
				"message":"コンテスト情報を取得しました",
				"contest_name":title,
				"start_time":startTime,
				"end_time":endTime,
				"duration":contestDuration,
				"status":true
			});

		}catch (err){
			console.log(err);
			return res.send({
				"message":"コンテストが見つかりません",
				"status":false
			});
		}
	})();
});

app.listen(port);
