/* sets up socket.io */
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
require('console-stamp')(console, '[HH:mm:ss.l]');

/* 
 * Details the constants for the player, ball creation
 * Constants also include ones for collsion checking
 */ 
var WIDTH = 800;
var HEIGHT = 600;

var P_HEIGHT = 100;
var P_WIDTH  = 10;
var P_STEP = 10;

var P_MTOP = 50;
var P_BTOP = 100;
var P_MBOTTOM = 550;
var P_TBOTTOM = 500;

var P_LSTARTX = 10;
var P_LSTARTY = 300;
var P_RSTARTX = 780;
var P_RSTARTY = 300;

var B_SIZE = 10;
var B_XSTART = 400; 
var B_YSTART = 300;
var B_VEL = 5;
var B_TOP = 5;
var B_BOTTOM = 595;  
var B_LBOUND = 25;
var B_RBOUND = 775;

var WIN_SCORE = 10;

var SERVER_UPDATE_INC = 1000/40;
var BALL_UPDATE_INC = 5000;

var socket_1 = null;
var socket_2 = null;

server.listen(9000, function(){
    console.log('listening on port 9000');
});

app.get('/',function(req,res){
    res.sendfile('index.html');
});

/*
 * player - describes player attributes
 */
function player(x,y){
    this.x_position = x;
    this.y_position = y;
    this.p_top = this.y_position - P_HEIGHT / 2;
    this.p_bottom = this.y_position + P_HEIGHT / 2;
}

/*
 * setY - changes player's y position, and calculates boundary attributes
 */
player.prototype.setY = function(y){
    this.y_position = y;
};

/*
 * updatePlayer - Moves player based on client message
 */
player.prototype.updatePlayer = function(position){
    this.y_position = position;
    this.p_top = this.y_position - P_HEIGHT / 2;
    this.p_bottom = this.y_position + P_HEIGHT / 2;   
};

/*
 * collsionPlayer - checks if player collides with upper/lower bounds of canvas
 */
player.prototype.collisionPlayer = function(){
    if(this.y_position < P_TOP){
        this.y_position = P_TOP;
    }
    else if(this.y_position > P_BOTTOM){
        this.y_position = P_BOTTOM;
    }
};


/*
 * ball - describes ball, intialized though resetBall
 */
function ball(){
    this.resetBall();   
}

/*
 * updateBall - update ball x,y position based on current heading
 * sets new boundaries for ball
 */
ball.prototype.updateBall = function(){
    this.x_position += this.x_velocity;
    this.y_position += this.y_velocity;
    this.b_top = this.y_position - B_SIZE / 2;
    this.b_bottom = this.y_position + B_SIZE / 2;
    this.b_left = this.x_position - B_SIZE / 2;
    this.b_right = this.x_position + B_SIZE / 2;

};

/*
 * collsionBall - sees if ball has collided with walls or player
 * On collision reflects ball x,y velocity
 * sends special message on x boundaries
 */
ball.prototype.collisionBall = function(player_1_p_top, player_1_p_bottom, player_2_p_top, player_2_p_bottom){
    if(this.y_position < B_TOP){
        this.y_position = B_TOP;
        this.b_top = 0;
        this.b_bottom = this.y_position + B_SIZE / 2;
        this.y_velocity *= -1;
    }
    else if (this.y_position > B_BOTTOM){
        this.y_position = B_BOTTOM;
        this.b_top = this.y_position + B_SIZE / 2;
        this.b_bottom = HEIGHT;
        this.y_velocity *= -1;

    }

    if(!this.scored && this.x_position < B_LBOUND){
        if(this.b_bottom >= player_1_p_top && this.b_top <= player_1_p_bottom){
            this.x_position = B_LBOUND;
            this.b_left = this.x_position - B_SIZE / 2;
            this.b_right = this.x_position + B_SIZE / 2;
            this.x_velocity *= -1;  
            return 'bounce';         
        }     
        else{
            console.log('score');
            return 'score 1';   
        }
    }
    else if(!this.scored && this.x_position > B_RBOUND){
        if(this.b_bottom >= player_2_p_top && this.b_top <= player_2_p_bottom){
            this.x_position = B_RBOUND;
            this.b_left = this.x_position - B_SIZE / 2;
            this.b_right = this.x_position + B_SIZE / 2;
            this.x_velocity *= -1;
            return 'bounce';              
        }
        else{
            console.log('score');
            return 'score 2';   
        }        
    }
};

/*
 * resetBall - initializes ball values
 * this is called for every ball that is created
 */
ball.prototype.resetBall = function(){
    this.x_position = B_XSTART;
    this.y_position = B_YSTART;
    this.b_top = this.y_position - B_SIZE / 2;
    this.b_bottom = this.y_position + B_SIZE / 2;
    this.b_left = this.x_position - B_SIZE / 2;
    this.b_right = this.x_position + B_SIZE / 2;
    this.angle = (Math.random() * 0.523) + 0.523;
    switch(Math.round(Math.random() *3)){
        case 0:
            break;
        case 1:
            this.angle += 1.57;
            break;
        case 2:
            this.angle *= -1;
            break;
        case 3:
            this.angle -= 1.57;
            break;
    }
    this.x_velocity = B_VEL * Math.cos(this.angle);
    this.y_velocity = B_VEL * Math.sin(this.angle);
    this.scored = false;
};

/*
 * game_slot - describes the game state
 */
function game_slot(){
    this.player_1 = new player(10, 300);
    this.player_2 = new player(780, 300);
    this.player_1_id = null;
    this.player_2_id = null;
    this.room_id = Math.random().toString(36).substr(2,9);
    this.pong_ball = new ball();
    this.pong_ball.resetBall();
    this.score_1 = 0;
    this.score_2 = 0;
    this.game_won = false;
}

/*
 * describes signals of client socket
 */
io.sockets.on('connection', function(socket){
    this.socket = socket;
    this.inputs = [];

    console.log('a user hass connected');

    socket.on('clientlogin', function(){
        clientLogin(socket);         
    });
    
    socket.on('positionupdate', function(input){
        GAME.positionUpdate(socket, input);  
    });
    
    socket.on('disconnect', function(input){
        disconnect(socket);   
    });
    

});


/*
 * clientLogin - attempts to create or add a player to a new game
 * tells the socket if a game is full
 */
function clientLogin(socket){
    
     console.log('attempt to find game');
    if (GAME && socket_1 && socket_2) {
        console.log('game full');
        socket.emit('gamefull', null);
        return;
    }
    if (!GAME){
        socket_1 = socket;
        GAME = new game_slot();
        console.log('room id', GAME.room_id);
        console.log(socket.id);
        GAME.player_1_id = socket.id;
        socket.join(GAME.room_id);  
        socket.emit('id', GAME.player_1_id); 
    }
    else if(!GAME.player_2_id){
        socket_2 = socket;
        GAME.player_2_id = socket.id;
        console.log('game found');
        console.log(socket.id);
        socket.emit('id', GAME.player_2_id);
        socket.join(GAME.room_id);  
        io.sockets.in(GAME.room_id).emit('gamefound', GAME);
        GAME.run();
        console.log('ready');
        
    }

         
        
}

/*
 * positionUpdate - update player position and alerts other player of new position
 */ 
game_slot.prototype.positionUpdate = function(socket, input){
    socket.broadcast.to(this.room_id).emit('otherplayerupdate', input);   
    if(socket.id == this.player_1_id){
        this.player_1.updatePlayer(input);
    }else{
        this.player_2.updatePlayer(input);
    }
     
};


/*
 * serverUpdate - server update loop
 */
game_slot.prototype.serverUpdate = function(socket){
    this.pong_ball.updateBall();
    b_status = this.pong_ball.collisionBall(this.player_1.p_top, this.player_1.p_bottom, this.player_2.p_top, this.player_2.p_bottom);

    if(b_status == 'bounce'){
        io.sockets.in(this.room_id).emit('ballupdate', this.pong_ball);
    }
    if(b_status == 'score 1'){
        this.pong_ball.resetBall();
        this.score_1++;            
        io.sockets.in(this.room_id).emit('scored 1', this.pong_ball); 
               
        if(this.score_1 == 10){
            this.game_won = true;
            io.sockets.in(this.room_id).emit('gameend', 'Player 1 wins!');
            clearInterval(this.intervalID);
        }

    }
    if(b_status == 'score 2'){
        this.pong_ball.resetBall();
        this.score_2++;
        io.sockets.in(this.room_id).emit('scored 2', this.pong_ball);
        if(this.score_2 == WIN_SCORE){
            this.game_won = true;
            io.sockets.in(this.room_id).emit('gameend', 'Player 2 wins!');
            endGame();
        }
    }

   
    
}; 

/* 
 * run - set server update loop
 */
game_slot.prototype.run = function(){
    this.intervalID = setInterval(this.serverUpdate.bind(this), SERVER_UPDATE_INC);  
};

/*
 * disconnect - on socket disconnect, end the game if the socket is a player
 */
function disconnect(socket){    
    console.log('socket disconnected');
    if(socket == socket_1 || socket == socket_2){
        endGame();
    }
}

/*
 * endGame - disconnect all sockets, stop the update loop and delete the game
 */
function endGame(){
    if(socket_1){
        socket_1.disconnect();
    }
    if(socket_2){
        socket_2.disconnect();
    }
    socket_1 = null;
    socket_2 = null;
    if(GAME && GAME.intervalID){
        clearInterval(GAME.intervalID);         
    }
    GAME = null;
}



