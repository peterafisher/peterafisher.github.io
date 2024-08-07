let plane_ids = ['alfa', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliett', 'kilo', 'lima', 'mike', 'november', 'oscar', 'papa', 'quebec', 'romeo', 'sierra', 'tango', 'uniform', 'victor', 'whiskey', 'xray', 'yankee', 'zulu']

let stats;
let client_id;
let my, guests, shared;

let startButton, timerDiv, scoreDiv, callsign, speedSlider, speedLabel, steeringContainer, steeringSlider;

let font;

let gameStateWait = 0;
let gameStatePlaying = 1;
let gameStateOver = 2;
let planeStateNone = 0;
let planeStateFlying = 1;
let planeStateLanded = 2;
let planeStateCrashed = 3;

let startTime;
let timeLimit = 300;

let canvasWidth = 800;
let canvasHeight = 500;

let landingStripX = canvasWidth / 2 - 60;
let landingStripY = canvasHeight / 2 - 10;
let landingStripW = 120;
let landingStripH = 20;
let landingTimer = 0;
let landingRequirement = 2;

const room = new URLSearchParams(location.search).get("room");
console.log("room:",room);

window.preload = () => {
  if (room && room > 0) {
    partyConnect("wss://demoserver.p5party.org", "MHR523 - ATC Exercise", room);
    font = loadFont('./Courier Prime.ttf');
    my = partyLoadMyShared();
    guests = partyLoadGuestShareds();
    shared = partyLoadShared("shared", {id_counter : int(random(26)), game_state : gameStateWait, score : 0, timer : timeLimit});
  }
}

window.mousePressed = () => {
  if (shared.game_state == gameStatePlaying && my.plane.plane_state != planeStateFlying) {
    spawn_plane(mouseX, mouseY);
    my.plane.plane_state = planeStateFlying;
  }
}

function spawn_plane(posx, posy) {
  my.plane = {x : posx,
              y : posy,
              a : random(2 * PI),
              isATC : partyIsHost(),
              ID : plane_ids[client_id % plane_ids.length],
              plane_state : planeStateNone
              };
}

window.setup = () => {
  let canvas = createCanvas(canvasWidth, canvasHeight);
  frameRate(30);
  textFont(font, 14);

  client_id = shared.id_counter;
  shared.id_counter++;

  partySubscribe("planeLanded", onPlaneLanded);

  spawn_plane(random(width), random(height));

  // Set up HUD

  timerDiv = createDiv("Timer: 300");
  timerDiv.id("timer");

  scoreDiv = createDiv("Score: 0");
  scoreDiv.id("score");

  if (partyIsHost()){
    callsign = createDiv("AIR TRAFFIC CONTROL");
    callsign.id("callsign");

    startButton = createButton("Begin simulation");
    startButton.mousePressed(startSimulation);
    startButton.id("start-button");

    timerDiv.hide();
    scoreDiv.hide();
  }
  else {
    callsign = createDiv("Call Sign: " + str(my.plane.ID));
    callsign.id("callsign");
  }

  // Set up speed GUI
  speedSlider = createSlider(10, 20, 10, 0.1);
  speedSlider.id("speed-slider");

  speedLabel = createDiv();
  speedLabel.id("speed-label");

  // Set up steering GUI
  steeringContainer = createDiv();
  steeringContainer.id("steering-container");

  steeringSlider = createSlider(-1, 1, 0, 0.5);
  steeringSlider.id("steering-slider");

  let steeringIcons = createDiv();
  steeringIcons.id("steering-icons");
  let leftIcon = createDiv("←");
  let diagonalLeftIcon = createDiv("↖");
  let straightIcon = createDiv("↑");
  let diagonalRightIcon = createDiv("↗");
  let rightIcon = createDiv("→");

  // Add arrow icons to GUI container
  steeringIcons.child(leftIcon);
  steeringIcons.child(diagonalLeftIcon);
  steeringIcons.child(straightIcon);
  steeringIcons.child(diagonalRightIcon);
  steeringIcons.child(rightIcon);
  steeringContainer.child(steeringIcons);
  steeringContainer.child(steeringSlider);

  let body = select('body');
  body.child(canvas);
  body.child(steeringContainer);
  body.child(speedSlider);
  body.child(speedLabel);
}

window.draw = () => {
  background(0);
  stroke(0, 255, 0);
  noFill();

  if (partyIsHost()){
    steeringContainer.hide();
    speedSlider.hide();
    speedLabel.hide();

    document.getElementById("callsign").innerHTML = "AIR TRAFFIC CONTROL"

    if (shared.timer > 0 && shared.game_state == gameStatePlaying) {
      shared.timer = Math.round(timeLimit - (Date.now() / 1000 - startTime));
    }
    else if (shared.timer <= 0) {
      shared.game_state = gameStateOver;
    }

    // This should only matter if the player has been made host mid-game
    my.plane.isATC = true;
  }
  else {
    steeringContainer.show();
    speedSlider.show();
    speedLabel.show();
  
    // Update speedLabel text based on speedSlider value
    document.getElementById("speed-label").innerHTML = str(speedSlider.value() * 40) + " knots";
  }

  // Draw landing strip
  push();
  stroke(255, 255, 255);
  rect(landingStripX, landingStripY, landingStripW, landingStripH);
  pop();

  // Draw grid
  push();
  strokeWeight(0.5);
  textSize(15);
  fill('green');
  let letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
  for (let i = 0; i < width / 10; i++) {
    line(width / 10 * i, 0, width / 10 * i, height);
    text(letters[i], width / 10 * i + (width / 20) - 5, 15);
    text(letters[i], width / 10 * i + (width / 20) - 5, height - 5)
  }
  for (let i = 0; i < height / 10; i++) {
    line(0, height / 10 * i, width, height / 10 * i);
    text(i, 5, height / 10 * i - (height / 20) + 7);
    text(i, width - 20, height / 10 * i - (height / 20) + 7);
  }
  pop();

  // Draw RADAR waves and rotating scanline
  push();
  translate(width / 2, height / 2);
  const count = 10;
  const offset = frameCount % (400 / count);
  for (let i = 0; i < count + 15; i++) {
    strokeWeight(max((count - i) / 10, 0.1));
    circle(0, 0, offset + 400 / count * i);
  }
  rotate(frameCount / 100);
  strokeWeight(1);
  line(0, 0, 600, 0);
  pop();

  if (!partyIsHost() &&
      shared.game_state == gameStatePlaying &&
      my.plane.plane_state == planeStateFlying) {
    movePlane();
  }

  drawPlanes();

  if (shared.game_state == gameStateWait) {
    if (partyIsHost()) {
      drawText("Wait until everyone is ready, then begin the simulation")
    }
    else {
      drawText("Wait until your Air Traffic Controller begins the simulation")
    }
  }
  else if (shared.game_state == gameStatePlaying) {
    if (partyIsHost()){}
    else if (my.plane.plane_state == planeStateNone) {
      drawText("The simulation has begun!\nConsult your Air Traffic Controller on where to begin piloting your plane");
    }
    else if (my.plane.plane_state == planeStateFlying) {}
    else if (my.plane.plane_state == planeStateLanded) {
      drawText("Congratulations on a successful test flight\nConsult your Air Traffic Controller on where to begin piloting your next plane");
    }
    else if (my.plane.plane_state == planeStateCrashed) {
      drawText("Looks like your test flight crashed\nConsult your Air Traffic Controller on where to begin piloting your next plane");
    }
  }
  else if (shared.game_state == gameStateOver) {
    drawText("Congratulations on finishing the simulation\nYour team's final score was " + str(shared.score));
  }

  document.getElementById("timer").innerHTML = "Timer: " + str(shared.timer);
  document.getElementById("score").innerHTML = "Score: " + str(shared.score);

  // stats.tick();
  // debugShow({
  //   stats,
  //   guests: guests,
  // });
}

function startSimulation() {
  startButton.hide();
  timerDiv.show();
  scoreDiv.show();

  shared.game_state = gameStatePlaying;

  startTime = new Date().getTime() / 1000;
}

function movePlane() {
  my.plane.x += sin(my.plane.a) * speedSlider.value() * deltaTime / 800;
  my.plane.y -= cos(my.plane.a) * speedSlider.value() * deltaTime / 800;
  my.plane.a += radians(steeringSlider.value() * deltaTime / 100);
  if (my.plane.x > width) {
    my.plane.x = 0;
  }
  if (my.plane.x < 0) {
    my.plane.x = width;
  }
  if (my.plane.y > height) {
    my.plane.y = 0;
  }
  if (my.plane.y < 0) {
    my.plane.y = height;
  }

  checkCollisions();
  checkLanding();
}

function checkCollisions() {
  for (const p of guests) {
    if (p.plane) {
      if (p.plane.ID != my.plane.ID && !p.plane.isATC) {
        if (dist(p.plane.x, p.plane.y, my.plane.x, my.plane.y) < 20) {
          my.plane.plane_state = planeStateCrashed;
        }
      }
    }
  }
}

function checkLanding() {
  if (my.plane.x > landingStripX &&
      my.plane.x < landingStripX + landingStripW &&
      my.plane.y > landingStripY &&
      my.plane.y < landingStripY + landingStripH) {
        landingTimer += deltaTime / 1000;
  }
  else {
    landingTimer = 0;
  }

  if (landingTimer > landingRequirement) {
    my.plane.plane_state = planeStateLanded;
    partyEmit("planeLanded");
  }
}

function onPlaneLanded() {
  if (partyIsHost()) {
    shared.score++;
  }
}

function drawPlanes() {
  for (const p of guests) {
    if (p.plane) {
      if (p.plane.isATC) {}
      else if (p.plane.plane_state != planeStateFlying) {}
      else if (partyIsHost() || p.plane.ID == my.plane.ID) {
        drawPlane(p.plane);
      }
      else {
        drawDot(p.plane);
      }
    }
  }
}

function drawPlane(plane) {
  // Draw triangle at correct position and rotation
  push();
  strokeWeight(3);
  noFill();
  rectMode(CENTER);
  translate(plane.x, plane.y);
  rotate(plane.a);
  triangle(-5, 10, 0, -10, 5, 10);
  pop();

  // Draw label on top at correct position (no rotation)
  push();
  stroke(0);
  fill(255);
  translate(plane.x, plane.y);
  text(plane.ID, 15, 15);
  pop();
}

function drawDot(plane) {
  push();
  noStroke();
  fill('white');
  translate(plane.x, plane.y);
  circle(0, 0, 10);
  pop();
}

function drawText(line) {
  let bbox = font.textBounds(line, 0, 0);
  push();
  stroke('green');
  fill('black');
  rect((width / 2) - (bbox.w / 2) - 5, (height / 2) - (bbox.h / 2) - 5, bbox.w + 10, bbox.h + 10);
  pop();
  push();
  textAlign(CENTER, CENTER);
  text(line, (width / 2), (height / 2));
  pop();
}