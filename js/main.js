/** @type {HTMLCanvasElement} */
const canv = document.getElementById('gameCanvas');
const ctx = canv.getContext('2d');

const FPS = 30; // frames per second
const FRICTION = 0.7;
const ROIDS_NUM = 1;
const ROIDS_JAG = 0.4;
const ROIDS_SIZE = 100; // size in pixels
const ROIDS_SPD = 50; // pixels per second
const ROIDS_VERT = 10;
const SHIP_SIZE = 30;
const TURN_SPEED = 360; // turn speed in degrees per second
const SHIP_ACC = 5; // pixels per seconds
const LASER_MAX = 10; // max lasers on screen
const LASER_SPEED = 500; // speed in pixels per second

let DEBUG_BOUNDING = false;
let DEBUG_CENTER_DOT = false;

let ship = {};
let exploding = null;

let level = 0;
let lvlMulti = 1 + 0.1 * level;
let textAlpha = '';
let msg = '';
let lives = 3;
let score = 0;
let playing = true;
let highscore;

let gameTick = setInterval(update, 1000 / FPS);

var roids = [];

newGame();

document.addEventListener('keydown', keyDown);
document.addEventListener('keyup', keyUp);

function newGame() {
  exploding = false;
  playing = true;
  lives = 3;
  level = 0;
  score = 0;
  newLevel();
}

function pauseGame() {
  if (playing) {
    clearInterval(gameTick);
    playing = false;
  } else {
    gameTick = setInterval(update, 1000 / FPS);
    playing = true;
  }
}

function getHighscore() {
  if (!localStorage.getItem('highscore')) {
    highscore = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  } else {
    highscore = localStorage
      .getItem('highscore')
      .split(',')
      .map(Number);
  }
}

function newLevel() {
  message(`Level ${level + 1} Start`);
  newShip();
  createAsteroidBelt();
}

function gameOver() {
  getHighscore();

  message(
    `Game Over \n  Your score: ${score} \n Current Highscore: ${highscore[0]}`
  );

  for (var i = 0; i < highscore.length; i++) {
    if (score > highscore[i]) {
      let pos = i - 1;
      if (i == 0) {
        pos = 0;
      }
      let newHigh = highscore.slice(0, pos).concat(score, highscore.slice(i));

      newHigh.pop();
      console.log(newHigh);
      score = null;

      localStorage.setItem('highscore', newHigh.join(','));
    }
  }

  playing = false;
}

function listHighscore() {
  getHighscore();

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canv.width, canv.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  ctx.font = 'small-caps 30px arial sans mono';
  ctx.fillText('Highscores', canv.width / 2, 50);
  for (let i = 0; i < highscore.length; i++) {
    ctx.fillText(`${i + 1}: ${highscore[i]}`, canv.width / 2, 110 + i * 34);
  }
}

function message(val) {
  textAlpha = 1.0;
  msg = val.split('\n');
}

function keyUp(ev) {
  switch (ev.keyCode) {
    case 32:
      ship.canShoot = true;
      break;
    case 37:
      ship.rot = 0;
      break;
    case 38:
      ship.thrusting = false;
      break;
    case 39:
      ship.rot = 0;
      break;
  }
}

function keyDown(ev) {
  switch (ev.keyCode) {
    case 32:
      shootLaser();
      break;
    case 37:
      ship.rot = ((TURN_SPEED / 180) * Math.PI) / FPS;
      break;
    case 38:
      ship.thrusting = true;
      break;
    case 39:
      ship.rot = ((-TURN_SPEED / 180) * Math.PI) / FPS;
      break;
    case 13:
      newGame();
      break;
    case 18:
      pauseGame();
      listHighscore();
      break;
  }
}

function createAsteroidBelt() {
  roids = [];
  let x, y;
  for (let i = 0; i < ROIDS_NUM + level; i++) {
    do {
      x = Math.floor(Math.random() * canv.width);
      y = Math.floor(Math.random() * canv.height);
    } while (distBetweenPoints(ship.x, ship.y, x, y) < ROIDS_SIZE * 2 + ship.r);
    roids.push(newAsteroid(x, y));
  }
}

function distBetweenPoints(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function newAsteroid(x, y, r = ROIDS_SIZE / 2) {
  let roid = {
    x,
    y,
    xV:
      ((Math.random() * ROIDS_SPD) / FPS) *
      (Math.random() < 0.5 ? 1 : -1) *
      lvlMulti,
    yV:
      ((Math.random() * ROIDS_SPD) / FPS) *
      (Math.random() < 0.5 ? 1 : -1) *
      lvlMulti,
    r,
    a: Math.random() * Math.PI * 2,
    vert: Math.floor(Math.random() * (ROIDS_VERT + 1) + ROIDS_VERT / 2),
    offset: []
  };

  for (let i = 0; i < roid.vert; i++) {
    roid.offset.push(Math.random() * ROIDS_JAG * 2 + 1 - ROIDS_JAG);
  }

  return roid;
}

function explodeShip() {
  exploding = true;
  ship.explodeTime = Math.ceil(0.3 * FPS);
}

function newShip() {
  ship = {
    x: canv.width / 2,
    y: canv.height / 2,
    r: SHIP_SIZE / 2,
    a: (90 / 180) * Math.PI, // convert to radians
    rot: 0,
    explodeTime: 0,
    thrusting: false,
    canShoot: true,
    lasers: [],
    thrust: {
      x: 0,
      y: 0
    }
  };
}

function shootLaser() {
  if (ship.canShoot && ship.lasers.length < LASER_MAX) {
    ship.lasers.push({
      x: ship.x + (4 / 3) * ship.r * Math.cos(ship.a),
      y: ship.y - (4 / 3) * ship.r * Math.sin(ship.a),
      xV: (LASER_SPEED * Math.cos(ship.a)) / FPS,
      yV: (-LASER_SPEED * Math.sin(ship.a)) / FPS,
      explodeTime: 0
    });
  }
  ship.canShoot = false;
}

function drawLives() {
  let color = 'green';
  if (lives == 2) {
    color = 'yellow';
  }
  if (lives == 1) {
    color = 'red';
  }
  for (var i = 0; i < lives; i++) {
    drawShip(40 * (i + 1), 25, (90 / 180) * Math.PI, color);
  }
}

function drawScore() {
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  ctx.font = 'small-caps 20px mono';
  ctx.fillText(score, canv.width - 15, 25);
}

function drawShip(
  xShip = ship.x,
  yShip = ship.y,
  aShip = ship.a,
  color = 'white'
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = SHIP_SIZE / 20;
  ctx.beginPath();
  ctx.moveTo(
    xShip + (4 / 3) * ship.r * Math.cos(aShip),
    yShip - (4 / 3) * ship.r * Math.sin(aShip)
  );
  ctx.lineTo(
    xShip - ship.r * ((2 / 3) * Math.cos(aShip) + Math.sin(aShip)),
    yShip + ship.r * ((2 / 3) * Math.sin(aShip) - Math.cos(aShip))
  );
  ctx.lineTo(
    xShip - ship.r * ((2 / 3) * Math.cos(aShip) - Math.sin(aShip)),
    yShip + ship.r * ((2 / 3) * Math.sin(aShip) + Math.cos(aShip))
  );
  ctx.closePath();
  ctx.stroke();
}

function updateShip() {
  if (!exploding) {
    if (ship.thrusting) {
      ship.thrust.x += (SHIP_ACC * Math.cos(ship.a)) / FPS;
      ship.thrust.y -= (SHIP_ACC * Math.sin(ship.a)) / FPS;

      ctx.fillStyle = 'red';
      ctx.strokeStyle = 'yellow';
      ctx.lineWidth = SHIP_SIZE / 10;
      ctx.beginPath();
      ctx.moveTo(
        ship.x - ship.r * ((2 / 3) * Math.cos(ship.a) + 0.5 * Math.sin(ship.a)),
        ship.y + ship.r * ((2 / 3) * Math.sin(ship.a) - 0.5 * Math.cos(ship.a))
      );
      ctx.lineTo(
        ship.x - ((ship.r * 6) / 3) * Math.cos(ship.a),
        ship.y + ((ship.r * 6) / 3) * Math.sin(ship.a)
      );
      ctx.lineTo(
        ship.x - ship.r * ((2 / 3) * Math.cos(ship.a) - 0.5 * Math.sin(ship.a)),
        ship.y + ship.r * ((2 / 3) * Math.sin(ship.a) + 0.5 * Math.cos(ship.a))
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ship.thrust.x -= (FRICTION * ship.thrust.x) / FPS;
      ship.thrust.y -= (FRICTION * ship.thrust.y) / FPS;
    }
    drawShip();
  } else {
    ctx.fillStyle = 'darkred';
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 1.7, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 1.4, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.fillStyle = 'orange';
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 1.1, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 0.8, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 0.5, 0, Math.PI * 2, false);
    ctx.fill();
    ship.thrust.x = 0;
    ship.thrust.y = 0;

    if (ship.explodeTime == 0) {
      exploding = false;
      lives--;
      lives > 0 ? newLevel() : gameOver();
    }
  }
}

function drawRoids() {
  roids.forEach(i => {
    ctx.strokeStyle = 'slategrey';
    ctx.fillStyle = 'slategrey';
    ctx.lineWidth = SHIP_SIZE / 20;
    ctx.beginPath();
    ctx.moveTo(
      i.x + i.r * i.offset[0] * Math.cos(i.a),
      i.y + i.r * i.offset[0] * Math.sin(i.a)
    );
    for (let j = 1; j < i.vert; j++) {
      ctx.lineTo(
        i.x + i.r * i.offset[j] * Math.cos(i.a + (j * Math.PI * 2) / i.vert),
        i.y + i.r * i.offset[j] * Math.sin(i.a + (j * Math.PI * 2) / i.vert)
      );
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (DEBUG_BOUNDING) {
      ctx.strokeStyle = 'lime';
      ctx.beginPath();
      ctx.arc(i.x, i.y, i.r, 0, Math.PI * 2, false);
      ctx.stroke();
    }

    if (distBetweenPoints(ship.x, ship.y, i.x, i.y) < ship.r + i.r) {
      if (!exploding) explodeShip();
    }

    i.x += i.xV;
    i.y += i.yV;

    if (i.x < 0 - i.r) {
      i.x = canv.width + i.r;
    } else if (i.x > canv.width + i.r) {
      i.x = 0 - i.r;
    }

    if (i.y < 0 - i.r) {
      i.y = canv.height + i.r;
    } else if (i.y > canv.height + i.r) {
      i.y = 0 - i.r;
    }
  });
}

function drawLaser() {
  ship.lasers.forEach((l, i) => {
    l.x += l.xV;
    l.y += l.yV;
    if (l.x < 0 || l.x > canv.width) {
      ship.lasers.splice(i, 1);
    }
    if (l.y < 0 || l.y > canv.height) {
      ship.lasers.splice(i, 1);
    }
    if (l.explodeTime == 0) {
      ctx.fillStyle = 'salmon';
      ctx.beginPath();
      ctx.arc(l.x, l.y, SHIP_SIZE / 15, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'darkred';
      ctx.beginPath();
      ctx.arc(l.x, l.y, ship.r * 1.2, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(l.x, l.y, ship.r * 0.9, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.fillStyle = 'orange';
      ctx.beginPath();
      ctx.arc(l.x, l.y, ship.r * 0.6, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.fillStyle = 'yellow';
      ctx.beginPath();
      ctx.arc(l.x, l.y, ship.r * 0.3, 0, Math.PI * 2, false);
      ctx.fill();
      l.xV = 0;
      l.yV = 0;
      l.explodeTime--;
      if (l.explodeTime <= 0) {
        ship.lasers.splice(i, 1);
      }
    }
  });
}

function update() {
  ship.explodeTime--;

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canv.width, canv.height);

  if (playing == true) {
    updateShip();
    drawRoids();
    drawLaser();
    drawScore();
  }

  drawLives();
  // DEBUG_BOUNDING = true;

  if (DEBUG_BOUNDING) {
    ctx.strokeStyle = 'lime';
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r, 0, Math.PI * 2, false);

    ctx.stroke();
  }

  // lazor hit

  roids.forEach((r, i) => {
    ship.lasers.forEach((l, j) => {
      if (distBetweenPoints(r.x, r.y, l.x, l.y) < r.r) {
        if (r.r > ROIDS_SIZE / 6) {
          roids.push(newAsteroid(r.x, r.y, Math.ceil(r.r / 2)));
          roids.push(newAsteroid(r.x, r.y, Math.ceil(r.r / 2)));
        }
        console.log(r.r);
        score += r.r * 5 * lvlMulti;
        roids.splice(i, 1);
        if (roids.length == 0) {
          level++;
          newLevel();
        }
        l.explodeTime = Math.ceil(0.1 * FPS);
      }
    });
  });

  // !lazor hit

  ship.a += ship.rot;

  ship.x += ship.thrust.x;
  ship.y += ship.thrust.y;

  if (ship.x < 0 - ship.r) {
    ship.x = canv.width + ship.r;
  } else if (ship.x > canv.width + ship.r) {
    ship.x = 0 - ship.r;
  }

  if (ship.y < 0 - ship.r) {
    ship.y = canv.height + ship.r;
  } else if (ship.y > canv.height + ship.r) {
    ship.y = 0 - ship.r;
  }

  DEBUG_CENTER_DOT = false;

  if (DEBUG_CENTER_DOT) {
    ctx.fillStyle = 'red';
    ctx.fillRect(ship.x - 1, ship.y - 1, 2, 2);
  }

  if (textAlpha > 0) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(255,255,255, ${textAlpha}`;
    ctx.font = 'small-caps 40px arial sans mono';
    for (let i = 0; i < msg.length; i++) {
      ctx.fillText(msg[i], canv.width / 2, canv.height * 0.625 + i * 44);
    }
    if (playing == true) {
      textAlpha -= 0.03;
    }
  }
}
