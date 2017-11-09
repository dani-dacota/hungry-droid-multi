var express = require('express');
var app = express();
var serv = require('http').Server(app);


app.get('/', function (req, res){
	res.sendFile(__dirname + '/client/index.html')

});

app.use ('/client', express.static(__dirname + '/client'));

serv.listen (process.env.PORT || 2000);
console.log('Server Started');

var SOCKET_LIST = {};
var GAME_LIST = {};

var Game = function(id){
	var self = {
		id: id,
		players: [],
		sockets: []
	}
	return self;
};

var Player = function(id, username){
	var self = {
		x:250,
		y:250,
		id:id,
		username: username,
		pressingRight: false,
		pressingLeft: false,
		pressingUp: false,
		pressingDown: false,
		maxSpeed: 10
	}
	self.updatePosition = function(){
		if(self.pressingRight)
			self.x +=self.maxSpeed;
		if(self.pressingLeft)
			self.x -=self.maxSpeed;
		if(self.pressingUp)
			self.y -=self.maxSpeed;
		if(self.pressingDown)
			self.y +=self.maxSpeed;
	}
	return self;
};

var io = require('socket.io')(serv,{}); 
io.sockets.on('connection', function(socket){
	socket.id = Math.floor(1000*Math.random());
	SOCKET_LIST[socket.id] = socket;
	console.log('New Socket Added:' + socket.id);
	var gameId = '';

	socket.on('disconnect', function(){
		//delete SOCKET_LIST[socket.id];
		//delete GAME_LIST['Game' + socket.id];
	});

	socket.on('keyPress', function(data){
		if (data.inputId === 'left')
			GAME_LIST[gameId].players[socket.id].pressingLeft = data.state;
		if (data.inputId === 'right')
			GAME_LIST[gameId].players[socket.id].pressingRight = data.state;
		if (data.inputId === 'up')
			GAME_LIST[gameId].players[socket.id].pressingUp = data.state;
		if (data.inputId === 'down')
			GAME_LIST[gameId].players[socket.id].pressingDown = data.state;
	});

	socket.on('newGame', function(data){
		console.log('Recieved New Game Request');
		gameId = 'Game' + socket.id;
		var game = Game(gameId);
		var player = Player(socket.id, data.username);
		game.players[socket.id] = player;
		game.sockets[socket.id] = SOCKET_LIST[socket.id];
		GAME_LIST[game.id] = game;
		console.log('Player ' + GAME_LIST[gameId].players[socket.id].username + ' added to ' + GAME_LIST[gameId].id + ' on socket: ' + GAME_LIST[gameId].sockets[socket.id].id);
		socket.emit('newGameResponse', {
			successful: 1,
			id: gameId
		});
	});

	socket.on('joinGame', function(data){
		console.log('Recieved Join Game Request');
		gameId = data.gameId;
		var player = Player(socket.id, data.username);
		GAME_LIST[gameId].players[socket.id] = player;
		GAME_LIST[gameId].sockets[socket.id] = SOCKET_LIST[socket.id];
		console.log('Player ' + GAME_LIST[gameId].players[socket.id].username + ' added to ' + GAME_LIST[gameId].id + ' on socket: ' + GAME_LIST[gameId].sockets[socket.id].id);
		socket.emit('joinGameResponse', {
			successful: 1,
			id: gameId
		});
	});

	
});


setInterval(function(){

	for (var j in GAME_LIST){
		var pack = [];
		//console.log('Loop: Game:' + GAME_LIST[j].id);
		for (var i in GAME_LIST[j].players){
			//console.log('Loop: Game:' + GAME_LIST[j].players[i].username);
			var player = GAME_LIST[j].players[i];
			player.updatePosition();
			pack.push({
				x:player.x,
				y:player.y,
				username:player.username
			});
			//console.log('Attaching ' + GAME_LIST[j].players[i].username + '\'s position');
		}

		for (var k in GAME_LIST[j].sockets){
			var socket = GAME_LIST[j].sockets[k];
			socket.emit('newPositions', pack);
		}
	}
	

}, 25);