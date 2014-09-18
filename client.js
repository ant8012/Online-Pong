


/*
 * Details the constants for player, ball creation
 * Constants also include ones for collision checking
 */
var WIDTH = 800;
var HEIGHT = 600;

var P_HEIGHT = 100;
var P_WIDTH = 10;
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


/*
 * game_slot - the main game contains data and functions about players and the game state
 */
var game_slot = function(){
    this.player = null;
    this.other_player = null;
    this.p_1 = null;

    this.pong_ball = null;
    this.score_1 = 0;
    this.score_2 = 0;
    this.socket = null;
    this.socket_id = null;
    this.intervalID = null;
    this.won = false;


    this.c = document.getElementById("myCanvas");
    this.ctx = this.c.getContext("2d");
    this.ctx.font = "30px Verdana";
    this.ctx.textAlign = 'center';

    this.current_key = null;

    this.frame_rate = 1000/20;

    this.printMessage("Click Me");

    this.login();

};


/*
 * login - initializes the socket and connects to the server
 * creates a number of signal handlers that handle data from and to the server
 */
 game_slot.prototype.login = function(){
    
        this.socket = io('antony-trinh.com:8000');

        this.clear();

        this.socket.emit('clientlogin');

        this.socket.on('id',function(id){
            this.socket_id = id;
        }.bind(this));

        this.socket.on('gamefound', function(GAME){
            this.game = GAME;
            this.initialize(GAME);
            this.drawUpdate();
            this.run();
        }.bind(this));
        
        this.socket.on('ready', function(){            
            this.run();
        }.bind(this));

        this.socket.on('scored 1', function(data){
            this.pong_ball = new ball(data);
            this.score_1++;
        }.bind(this));

        this.socket.on('scored 2', function(data){
            this.pong_ball = new ball(data);
            this.score_2++;
        }.bind(this));


        this.socket.on('ballupdate', function(data){
            this.pong_ball = new ball(data);
        }.bind(this));


        this.socket.on('otherplayerupdate', function(data){
            this.other_player.setY(data);
        }.bind(this));

        this.socket.on('gamefull', function(){
            this.printMessage("Game full please wait");
            window.setTimeout(function(){this.socket.emit('clientlogin');},5000);
        }.bind(this));
        
        this.socket.on('gameend', function(data){
            game.won = true;
            this.printMessage(data);
            endGame();           
        }.bind(this));

        this.socket.on('disconnect', function(){
            if(game && !game.won){
                endGame();
                this.printMessage('Disconnected from Server');
            }          
        }.bind(this));
};


/*
 * initialize - sets up the players and ball for the new game
 */
 game_slot.prototype.initialize = function(GAME){
        if(GAME.player_1_id == this.socket_id){
            this.player = new player(P_LSTARTX, P_LSTARTY);
            this.other_player = new player(P_RSTARTX, P_RSTARTY);
            this.p_1 = true;
            this.printMessage("You are player 1");
        }
        else{
            this.player = new player(P_RSTARTX, P_RSTARTY);
            this.other_player = new player(P_LSTARTX, P_LSTARTY);
            this.p_1 = false;
            this.printMessage("you are player 2");
        }
        this.pong_ball = new ball(GAME.pong_ball);
};

/*
 * run - sets up the binding for the keys, credit goes to https://github.com/jeremyckahn/keydrown
 * setsup and runs the main game loop
 */
game_slot.prototype.run = function(){
        kd.W.down(function(){
            this.current_key = 'U';
        }.bind(this));
        kd.S.down(function(){
            this.current_key = 'D';
        }.bind(this));
        kd.W.up(function(){
            this.current_key = null;
        }.bind(this));
        kd.S.up(function(){
            this.current_key = null;
        }.bind(this));

    this.intervalID = window.setInterval(this.update.bind(this), 1000/40);

};

/*
 * clear - clears the canvas and fills with black
 */
 game_slot.prototype.clear = function(){
        this.ctx.fillStyle = 'black';
        this.ctx.clearRect(0,0,WIDTH, HEIGHT);
        this.ctx.fillRect(0,0,WIDTH,HEIGHT);
        
};

/*
 * printMessage - clears the canvas and prints a message
 */
 game_slot.prototype.printMessage = function(message){
        this.clear();
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(message, WIDTH / 2, HEIGHT / 2);
};

/*
 * drawUpdate - clears the canvas and draws the players and ball
 */
 game_slot.prototype.drawUpdate = function(){
        this.clear();
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(this.score_1, 300, 100);
        this.ctx.fillText(this.score_2, 500, 100);
        this.ctx.fillRect(this.player.x_position, this.player.p_top, P_WIDTH, P_HEIGHT);
        this.ctx.fillRect(this.other_player.x_position, this.other_player.p_top, P_WIDTH, P_HEIGHT);
        this.ctx.fillRect(this.pong_ball.b_left, this.pong_ball.b_top, B_SIZE, B_SIZE);
};

/*
 * player - describes player attributes
 */
function player(x,y){
    this.x_position = x;
    this.y_position = y;
    this.p_top = this.y_position - P_HEIGHT / 2;
    this.p_bottom = this.y_position + P_HEIGHT /2;
}

/*
 * updatePlayer - Moves the player based on input
 */
player.prototype.updatePlayer = function(input){
    if(input == 'U'){
        this.y_position -= P_STEP;
        this.p_top -= P_STEP;
        this.p_bottom -= P_STEP;
    }
    else if(input == 'D'){
        this.y_position += P_STEP;
        this.p_top += P_STEP;
        this.p_bottom += P_STEP;

    }
};

/*
 * collisionPlayer - checks if player collides with upper/lower bounds of canvas
 */
player.prototype.collisionPlayer = function(){
    if(this.p_top < 0){
        this.p_top = 0;
        this.y_position = P_MTOP;
        this.p_bottom = P_BTOP;
    }
    else if(this.p_bottom > HEIGHT){
        this.p_top = P_TBOTTOM;
        this.y_position = P_MBOTTOM;        
        this.p_bottom = HEIGHT;    
    }    
};

/*
 * setY - changes player's y position, and calculates boundary attributes
 */
player.prototype.setY = function(y){
    this.y_position = y;
    this.p_top = this.y_position - P_HEIGHT / 2;
    this.p_bottom = this.y_position + P_HEIGHT /2;

};

/*
 * getY - returns player y position
 */
player.prototype.getY = function(){
    return this.y_position;
};

/*
 * ball - describes ball attributes
 */
function ball(server_b){
    this.x_position = server_b.x_position;
    this.y_position = server_b.y_position;
    this.b_top = this.y_position - B_SIZE / 2;
    this.b_bottom = this.y_position + B_SIZE /2;
    this.b_left = this.x_position - B_SIZE / 2;
    this.b_right = this.x_position + B_SIZE / 2;
    this.angle = server_b.angle;
    this.x_velocity = server_b.x_velocity;
    this.y_velocity = server_b.y_velocity;
    this.scored = false;
}

/*
 * updateBall - update ball x,y position based on currnet heading
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
 * collisionBall - sees if ball has collided with walls or player
 * On collision reflects ball x,y velocity
 * indicates if a player has scored
 */
ball.prototype.collisionBall = function(player_1_p_top, player_1_p_bottom, player_2_p_top, player_2_p_bottom){
    if(this.y_position < B_TOP){
        this.y_position = B_TOP;
        this.b_top = 0;
        this.b_bottom = this.y_position + B_SIZE / 2;
        this.y_velocity *= -1;
    }
    else if(this.y_position > B_BOTTOM){
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
        
        }
        else{
            this.scored = true;
        }
    }
    else if(!this.scored && this.x_position > B_RBOUND){
        if(this.b_bottom >= player_2_p_top && this.b_top <= player_2_p_bottom){
            this.x_position = B_RBOUND;
            this.b_left = this.x_position - B_SIZE / 2;
            this.b_right = this.x_position + B_SIZE / 2;
            this.x_velocity *= -1;
            
        }
        else{
            this.scored = true;
        }
    }

};


/*
 * update - main update loop
 * Updates player and ball and checks for collision
 */
game_slot.prototype.update = function (){
        
    kd.tick();  

    this.player.updatePlayer(this.current_key);
    this.player.collisionPlayer();
    position = this.player.getY();
    this.socket.emit('positionupdate', position);   
    this.pong_ball.updateBall();

    if(this.p_1){
        this.pong_ball.collisionBall(this.player.p_top, this.player.p_bottom, this.other_player.p_top, this.other_player.p_bottom);
    }
    else{
         this.pong_ball.collisionBall(this.other_player.p_top, this.other_player.p_bottom, this.player.p_top, this.player.p_bottom);
   
    }
    this.drawUpdate();

};

/*
 * endGame - on disconnect or game end stop update loop and reset game
 */
function endGame(){
    if(game && game.intervalID){
        clearInterval(game.intervalID);
    }
    game = null;
}
  
game = new game_slot();

