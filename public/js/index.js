!(function(win, doc, $, io){
	var socket = io.connect();

	var USER_LIST = [];
	var getUserHead = function(name, type){
		var uhid = null;
		$.each(USER_LIST, function(i,v){
			if(v.name === name){
				uhid = v.userHeadId;
			}
		});
		return uhid;
	};

	var showmessage = function(from, msg, type){
		var from = formatHTML(from);

		var userHeadId = getUserHead(from);

		var msg = formatHTML(msg),
		type = !type ? '' : 'type-' + type,
		from = type === 'private' ? from + ' [私信]' : from,
		user = from;


		userHead = (type === 'type-system') ? '/images/head/system.png' : '/images/head/'+userHeadId+'-m.png' ;

		msg = AnalyticEmotion(msg);
		var nowTime = new Date().format('yyyy-MM-dd hh:mm:ss');

		var html = '<div class="chat-list-i ' + (type === 'type-own' ? '' : 'chat-list-guest' )+ '">\
					<div class="chat-list-user">\
						<a href="javascript:;" title="' + from + '"><img src="'+userHead+'" /></a>\
					</div>\
					<div class="chat-list-text">\
						<span class="arrow">◆<i>◆</i></span>\
						<div class="chat-list-msg">\
							<p><b>' + from + '</b><em>' + nowTime + '</em></p>\
							<p>' + msg + '</p>\
						</div>\
					</div>\
				</div>';
		$("#chat-list").append(html).scrollTop(+1000);
	};

	var showonline = function(n){
		var html = '';
		$.each(n, function(i,v){
			if(v.name != userName){
				html += '<div class="line">\
							<a href="javascript:;"  onclick="private_message(\'' + v.name + '\')">\
									<span class="user-post"><img src="/images/head/'+v.userHeadId+'-m.png" /></span>\
									<span class="user-name">'+v.name+'</span>\
								</a>\
							</div>';
			}else{
				$("#bigUserHead").attr('src', '/images/head/'+v.userHeadId+'.png');
			}
		});
		$('#userList').html(html);
	};

	var clearmessage = function(){
		$('#chat-list .chat-list-i').remove();
	};

	var private_message = function(n){
		var $m = $('#message');
		$m.val('@'+n+' '+$m.val()).focus();
		setCaretPosition('message');
	};

	function setCaretPosition(elemId){
		var elem = document.getElementById(elemId);
		var caretPos = elem.value.length;
		if(elem != null){
			if(elem.createTextRange){
				var range = elem.createTextRange();
				range.move('character', caretPos);
				range.select();
			}else{
				elem.setSelectionRange(caretPos, caretPos);
				elem.focus();

				var evt = document.createEvent("KeyboardEvent");
				evt.initKeyEvent("keypress", true, true, null, false, false, false, false, 0 , 32);
				elem.dispatchEvent(evt);

				evt = document.createEvent('KeyboardEvent');
				evt.initKeyEvent("keypress", true, true, null, false, false, false, false, 0 , 8);
				elem.dispatchEvent(evt);
			}
		}
	}

	var sendmessage = function(){
		var msg = $.trim($('#message').val());
		if(msg.length ===0){
			return;
		}

		if(msg.substr(0,1) == '@'){
			var p = msg.indexOf(' ');
			if(p > 0){
				var to = msg.substr(1, p-1);
				msg = msg.substr(p+1);

				socket.emit('private message', to, msg, function(ok){
					if(ok){
						showmessage(userName, msg, 'own');
						$('#message').val('');
					}
				});
				return;
			}
		}

		socket.emit('public message', msg, function(ok){
			if(ok){
				$("#message").val('');
				showmessage(userName, msg, 'own');
			}
		});
	};

	var listener = function(){
		socket.on('connect', function(){
			clearmessage();
			showmessage('系统', '已进入房间！在发送的消息前面加“@”对方名称+空格+消息可以给某人发信息。','system');
		});

		socket.on('public message', function(from, msg){
			showmessage(from, msg);
		});

		socket.on('private message', function(from, msg){
			showmessage(from, msg, 'private');
		});

		socket.on('system message', function(msg){
			showmessage('系统', msg, 'system');
		});

		socket.on('online list', function(ns){
			USER_LIST = ns;
			showonline(ns);
		});

		socket.on('message error', function(to, msg){
			showmessage('系统', '刚刚发送给'+to+'的消息'+msg+'失败!','error');
		});
	};

	var init = function(){
		listener();
		$('#btn').click(sendmessage);
		$('#message').keypress(function(e){
			if(e.keyCode === 13){
				sendmessage();
				return false;
			}
		});
	};

	function formatHTML(html){
		html = html.replace(/</g, '&lt;');
		html = html.replace(/>/g, '&gt;');
		return html;
	}
	
	init();

	win.private_message = private_message;

})(window, document, jQuery, io);