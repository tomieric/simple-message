/*
*	在线聊天
*/

var express = require('express'),
	sio = require('socket.io'),
	fs = require('fs'),
	path = require('path'),
	url = require('url'),
	cookie = require('cookie');
	connect  =  require('connect'),
	parseCookie = connect.utils.parseSignedCookies,
	MemoryStore = connect.middleware.session.MemoryStore;
	
/*
* 私人聊天使用session
*/
var userWS = {},
	userInfo = {},
	storeMemory = new MemoryStore({
		reapInterval: 60000 * 10
	});

//创建app服务
var http = require("http");
var app = module.exports = express();
var server = http.createServer(app);

// 配置
app.configure(function(){
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({
		secret: 'qqchat',
		store: storeMemory
	}));
	app.use(express.methodOverride());
	app.use(app.router);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
	app.use(express.static(__dirname + '/public'));
});

/*
* socket.io 配置
*/
var io = sio.listen(server);
io.set('authorization', function(handshakeData, callback){
	
//	handshakeData.cookie = parseCookie(handshakeData.headers.cookie, 'qqchat');
//console.log(handshakeData.cookie);	

	handshakeData.cookie = parseCookie(cookie.parse(decodeURIComponent(handshakeData.headers.cookie)),'qqchat');
	
	//handshakeData.cookie = connect.utils.parseSignedCookie(decodeURIComponent(handshakeData.headers.cookie),'qqchat');
	
	//console.log(handshakeData.cookie);	

	var connect_sid = handshakeData.cookie['connect.sid'];

	if(connect_sid){
		storeMemory.get(connect_sid, function(error, session){
			if(error){
				callback(error.message, false);
			}else{
				handshakeData.session = session;
				callback(null, true);
			}
		});
	}else{
		callback('nosession');
	}
});

/*
* 路由选择
*/
app.get('/', function(req, res){
	// 已经登录
	if(req.session.name && req.session.name !== ''){
		res.redirect('/chat');
	}else{
		//尚未登录
		var realpath = __dirname + '/views/' + url.parse('login.html').pathname;
		var txt = fs.readFileSync(realpath);
		res.end(txt);
	}
});

app.get('/chat', function(req, res){
	if(req.session.name && req.session.name !==""){
		//var userHeadId = parseInt(Math.random()*11);
		res.render('chat', {name: req.session.name, userHeadId: req.session.userHeadId});
	}else{
		res.redirect('/');
	}
});

app.post('/chat', function(req, res){
	var name = req.body.nick;
	var userHeadId = parseInt(Math.random()*10) + 1;
	if(name && name !== ""){
		req.session.name = name;
		//req.session.userHeadId = userHeadId;
		userInfo[name] = { name: name, userHeadId: userHeadId};
		res.render('chat', {name: name, userHeadId: userHeadId});
	}else{
		res.end('nickname connot null');
	}
});

/*
* sokect 监听
*/
io.sockets.on("connection", function(socket){
	var session = socket.handshake.session;
//console.log(socket.handshake.session.name);
	//console.log(session);
	if(!session) return;
	var name = session.name;
	//var userHeadId = session.userHeadId;
	
	//cache.name = socket;
	//cache.userHeadId = userHeadId;
	//userWS[name] = cache;
	userWS[name] = socket;
	//userWS[name]['userHeadId'] = userHeadId;
//console.log(userInfo);	
	var refresh_online = function(){
		var n = [];
		for(var i in userWS){
			var cache = {};
			cache['name'] = i;
			cache['userHeadId'] = userInfo[i].userHeadId;
			n.push(cache);
		}
		io.sockets.emit("online list", n);
	};
	
	refresh_online();
	
	socket.broadcast.emit('system message', '【'+name+'】回来了，大家赶紧去找TA聊聊');
	
	socket.on("public message", function(msg, fn){
		socket.broadcast.emit("public message", name, msg);
		fn(true);
	});
	
	socket.on("private message", function(to, msg, fn){
		var target = userWS[to];
		if(target){
			fn(true);
			target.emit("private message", name+"[私信]", msg);
		}else{
			fn(false);
			socket.emit("message error", to, msg);
		}
	});
	
	socket.on("disconnect", function(){
		delete userWS[name];
		session = null;
		socket.broadcast.emit("system message", "【" + name + "】下线了~");
		refresh_online();
	});
});


//启动服务
server.listen(3000, function(){
	var addr = server.address();
	console.log('app listening on http://127.0.0.1:' + addr.port);
});