const canvas = document.querySelector("canvas");

const ctx = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;

// Create a player
class Player {
  constructor(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

class Projectile {
  constructor(x, y, radius, color, velocity) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocity = velocity;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  update() {
    this.draw();
    this.x = this.x + this.velocity.x;
    this.y = this.y + this.velocity.y;
  }
}

class Enemy {
  constructor(x, y, radius, color, velocity) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocity = velocity;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  update() {
    this.draw();
    this.x = this.x + this.velocity.x;
    this.y = this.y + this.velocity.y;
  }
}

const x = canvas.width / 2;
const y = canvas.height / 2;

// Players call
const player = new Player(x, y, 30, "blue");

const projectiles = [];
const enemies = [];

// Enemies call
function spawnEnemies() {
  setInterval(() => {
    const radius = Math.random() * (30 - 5) + 5;
    let x;
    let y;
    if (Math.random() < 0.5) {
      x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius;
      y = Math.random() * canvas.height;
    } else {
      x = Math.random() * canvas.width;
      y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius;
    }

    const color = "green";

    const angle = Math.atan2(canvas.height / 2 - y, canvas.width / 2 - x);
    const velocity = {
      x: Math.cos(angle),
      y: Math.sin(angle),
    };
    enemies.push(new Enemy(x, y, radius, color, velocity));
  }, 1000);
}

// main loop
let animationId; //to pause we have to create a seperate animate id
function animate() {
  animationId = requestAnimationFrame(animate);
  ctx.clearRect(0, 0, canvas.width, canvas.height); //to draw particles instead of lines
  player.draw();
  projectiles.forEach((projectile, index) => {
    projectile.update();

    //remove off screen projectiles from game
    if (
      projectile.x + projectile.radius < 0 ||
      projectile.x - projectile.radius > canvas.width ||
      projectile.y + projectile.radius < 0 ||
      projectile.y - projectile.radius > canvas.height
    ) {
      setTimeout(() => {
        projectiles.splice(index, 1);
      }, 0);
    }
  });

  enemies.forEach((enemy, index) => {
    enemy.update();

    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y); //get distance btw player & enemy

    //end game
    if (dist - enemy.radius - player.radius < 1) {
      cancelAnimationFrame(animationId);
    }

    projectiles.forEach((projectile, projectileIndex) => {
      //dectect collision
      const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y); //get distance btw projetile & enemy

      //object touch
      if (dist - enemy.radius - projectile.radius < 1) {
        setTimeout(() => {
          enemies.splice(index, 1);
          projectiles.splice(projectileIndex, 1);
        }, 0);
      }
    });
  });
}

// Projectiles call
addEventListener("click", (event) => {
  console.log(projectiles);
  const angle = Math.atan2(
    event.clientY - canvas.height / 2,
    event.clientX - canvas.width / 2
  );
  const velocity = {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
  projectiles.push(
    new Projectile(canvas.width / 2, canvas.height / 2, 5, "red", velocity)
  );
});

animate();
spawnEnemies();
